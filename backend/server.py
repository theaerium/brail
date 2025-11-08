from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============ User Models ============
class User(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    pin_hash: str  # Hashed PIN
    created_at: datetime = Field(default_factory=datetime.utcnow)
    biometric_enabled: bool = False

class UserCreate(BaseModel):
    username: str
    pin_hash: str

class UserLogin(BaseModel):
    username: str
    pin_hash: str


# ============ Item Models ============
class Item(BaseModel):
    item_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    category: str
    subcategory: str
    brand: str
    condition: str
    photo: str  # base64 encoded
    value: float
    is_fractional: bool = False
    share_percentage: float = 1.0  # 1.0 = 100%
    parent_item_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ItemCreate(BaseModel):
    owner_id: str
    category: str
    subcategory: str
    brand: str
    condition: str
    photo: str
    value: float

class ItemUpdate(BaseModel):
    share_percentage: Optional[float] = None
    owner_id: Optional[str] = None


# ============ Trade Models ============
class TradeItem(BaseModel):
    item_id: str
    share_percentage: float
    value: float
    previous_owner: str
    new_owner: str

class Trade(BaseModel):
    trade_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    payer_id: str
    payee_id: str
    items: List[TradeItem]
    total_value: float
    status: str = "completed"  # pending, completed, failed
    payer_signature: str
    payee_signature: str

class TradeCreate(BaseModel):
    payer_id: str
    payee_id: str
    items: List[TradeItem]
    total_value: float
    payer_signature: str
    payee_signature: str


# ============ User Endpoints ============
@api_router.post("/users/register", response_model=User)
async def register_user(user: UserCreate):
    # Check if username exists
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_obj = User(**user.dict())
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.post("/users/login")
async def login_user(credentials: UserLogin):
    user = await db.users.find_one({
        "username": credentials.username,
        "pin_hash": credentials.pin_hash
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return User(**user)

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)


# ============ Item Endpoints ============
@api_router.post("/items", response_model=Item)
async def create_item(item: ItemCreate):
    item_obj = Item(**item.dict())
    await db.items.insert_one(item_obj.dict())
    return item_obj

@api_router.get("/items/user/{user_id}", response_model=List[Item])
async def get_user_items(user_id: str):
    items = await db.items.find({"owner_id": user_id}).to_list(1000)
    return [Item(**item) for item in items]

@api_router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: str):
    item = await db.items.find_one({"item_id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return Item(**item)

@api_router.put("/items/{item_id}", response_model=Item)
async def update_item(item_id: str, update: ItemUpdate):
    item = await db.items.find_one({"item_id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.items.update_one(
        {"item_id": item_id},
        {"$set": update_data}
    )
    
    updated_item = await db.items.find_one({"item_id": item_id})
    return Item(**updated_item)

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str):
    result = await db.items.delete_one({"item_id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}


# ============ Trade Endpoints ============
@api_router.post("/trades", response_model=Trade)
async def create_trade(trade: TradeCreate):
    trade_obj = Trade(**trade.dict())
    
    # Update item ownership
    for item in trade.items:
        await db.items.update_one(
            {"item_id": item.item_id},
            {"$set": {
                "owner_id": item.new_owner,
                "share_percentage": 1.0 - item.share_percentage if item.share_percentage < 1.0 else 0.0,
                "updated_at": datetime.utcnow()
            }}
        )
    
    await db.trades.insert_one(trade_obj.dict())
    return trade_obj

@api_router.get("/trades/user/{user_id}", response_model=List[Trade])
async def get_user_trades(user_id: str):
    trades = await db.trades.find({
        "$or": [{"payer_id": user_id}, {"payee_id": user_id}]
    }).to_list(1000)
    return [Trade(**trade) for trade in trades]

@api_router.post("/trades/sync")
async def sync_offline_trades(trades: List[TradeCreate]):
    synced = []
    failed = []
    
    for trade_data in trades:
        try:
            trade_obj = Trade(**trade_data.dict())
            await db.trades.insert_one(trade_obj.dict())
            
            # Update item ownership
            for item in trade_obj.items:
                await db.items.update_one(
                    {"item_id": item.item_id},
                    {"$set": {
                        "owner_id": item.new_owner,
                        "updated_at": datetime.utcnow()
                    }}
                )
            
            synced.append(trade_obj.trade_id)
        except Exception as e:
            failed.append({"error": str(e)})
    
    return {"synced": len(synced), "failed": len(failed), "synced_ids": synced}


# ============ Valuation Endpoint ============
@api_router.post("/valuations/mock")
async def get_mock_valuation(data: dict):
    """Mock valuation based on category, brand, and condition"""
    
    # Mock valuation table
    VALUATIONS = {
        "clothing": {
            "shirt": {"Nike": 30, "Adidas": 25, "Puma": 20, "Generic": 10},
            "pants": {"Nike": 40, "Adidas": 35, "Puma": 30, "Generic": 15},
            "jacket": {"Nike": 80, "Adidas": 70, "Puma": 60, "Generic": 25},
            "shorts": {"Nike": 25, "Adidas": 20, "Puma": 18, "Generic": 8}
        },
        "shoes": {
            "sneakers": {"Nike": 80, "Adidas": 70, "Puma": 60, "Generic": 30},
            "boots": {"Nike": 100, "Adidas": 90, "Puma": 80, "Generic": 40},
            "sandals": {"Nike": 30, "Adidas": 25, "Puma": 20, "Generic": 10}
        },
        "accessories": {
            "watch": {"Rolex": 5000, "Casio": 50, "Generic": 20},
            "bag": {"Nike": 50, "Adidas": 45, "Generic": 15},
            "hat": {"Nike": 25, "Adidas": 20, "Generic": 8}
        },
        "electronics": {
            "phone": {"Apple": 800, "Samsung": 600, "Generic": 200},
            "tablet": {"Apple": 500, "Samsung": 350, "Generic": 150},
            "laptop": {"Apple": 1200, "Dell": 800, "Generic": 400}
        }
    }
    
    CONDITION_MULTIPLIERS = {
        "new": 1.0,
        "excellent": 0.9,
        "good": 0.7,
        "fair": 0.5,
        "poor": 0.3
    }
    
    category = data.get("category", "")
    subcategory = data.get("subcategory", "")
    brand = data.get("brand", "Generic")
    condition = data.get("condition", "good")
    
    # Get base value
    base_value = 10  # default
    if category in VALUATIONS:
        if subcategory in VALUATIONS[category]:
            if brand in VALUATIONS[category][subcategory]:
                base_value = VALUATIONS[category][subcategory][brand]
            else:
                base_value = VALUATIONS[category][subcategory].get("Generic", 10)
    
    # Apply condition multiplier
    multiplier = CONDITION_MULTIPLIERS.get(condition, 0.7)
    final_value = round(base_value * multiplier, 2)
    
    return {
        "value": final_value,
        "currency": "USD",
        "base_value": base_value,
        "condition_multiplier": multiplier
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
