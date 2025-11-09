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
import re


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
    # Personal Information
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    pin_hash: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    pin_hash: str

class PersonalInfoUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None


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
    value: Optional[float] = None

class DepositAnalysisRequest(BaseModel):
    image_base64: str  # Base64 encoded image with or without data:image prefix

class DepositAnalysisResponse(BaseModel):
    name: str
    description: str
    category: str
    subcategory: str
    brand: str
    estimated_value: float
    condition: str = "good"


# ============ Transaction Models ============
class ItemDetails(BaseModel):
    brand: Optional[str] = None
    subcategory: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None

class SpentItem(BaseModel):
    item_id: str
    label: Optional[str] = None
    amount: float
    fraction: float


class Transaction(BaseModel):
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # deposit, payment, withdrawal, refund
    amount: float
    item_id: Optional[str] = None
    item_details: Optional[ItemDetails] = None
    merchant_name: Optional[str] = None
    website_name: Optional[str] = None
    status: str = "completed"  # pending, completed, failed, cancelled
    description: Optional[str] = None
    spent_items: Optional[List[SpentItem]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class TransactionCreate(BaseModel):
    user_id: str
    type: str
    amount: float
    item_id: Optional[str] = None
    item_details: Optional[ItemDetails] = None
    merchant_name: Optional[str] = None
    website_name: Optional[str] = None
    status: str = "completed"
    description: Optional[str] = None
    spent_items: Optional[List[SpentItem]] = None


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

    user_obj = User(**user.model_dump())
    await db.users.insert_one(user_obj.model_dump())
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


@api_router.get("/users/by-username/{username}", response_model=User)
async def get_user_by_username(username: str):
    user = await db.users.find_one({
        "username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}
    })
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}/personal-info", response_model=User)
async def update_personal_info(user_id: str, personal_info: PersonalInfoUpdate):
    # Check if user exists
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prepare update data (only include non-None values)
    update_data = {k: v for k, v in personal_info.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided to update")

    # Update user
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )

    # Return updated user
    updated_user = await db.users.find_one({"user_id": user_id})
    return User(**updated_user)


# ============ AI Deposit Analysis Endpoint ============
@api_router.post("/items/analyze-deposit", response_model=DepositAnalysisResponse)
async def analyze_item_for_deposit(request: DepositAnalysisRequest):
    """
    Analyze an item image using AI (GPT-4 Vision) to extract:
    - Item name
    - Description
    - Category and subcategory
    - Brand
    - Estimated market value
    """
    try:
        from openai import AsyncOpenAI

        # Get API key from environment
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")

        # Clean base64 string (remove data:image prefix if present)
        image_base64 = request.image_base64
        if "base64," in image_base64:
            image_base64 = image_base64.split("base64,")[1]

        # Create OpenAI client
        client = AsyncOpenAI(api_key=api_key)

        # Create analysis prompt
        prompt = """Analyze this item image and provide detailed information in the following format:

NAME: [Clear, concise item name]
DESCRIPTION: [Detailed 2-3 sentence description]
CATEGORY: [One of: clothing, shoes, electronics, accessories, furniture, jewelry, sports, tools, books, toys]
SUBCATEGORY: [Specific type - e.g., for clothing: shirt, pants, jacket, shorts; for shoes: sneakers, boots, sandals; for electronics: phone, tablet, laptop, headphones; for accessories: watch, bag, hat, sunglasses]
BRAND: [Brand name if visible or identifiable, otherwise "Generic"]
CONDITION: [One of: new, excellent, good, fair, poor - based on visual appearance]
VALUE: [Realistic current market value in USD as a number only, e.g., 299.99]

Important guidelines:
- Be realistic with valuations based on current market prices
- Consider condition when estimating value
- If brand is not clearly visible, use "Generic"
- Choose the most specific category and subcategory that fits
- Provide accurate, honest assessments"""

        logger.info("Sending image to AI for analysis...")

        # Call OpenAI API with vision
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert item appraiser and identifier. Analyze images of physical items and provide accurate details."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )

        response_text = response.choices[0].message.content
        logger.info(f"AI Response: {response_text}")

        # Parse the structured response
        parsed_data = {}

        # Extract fields using regex
        name_match = re.search(r'NAME:\s*(.+?)(?:\n|$)', response_text, re.IGNORECASE)
        desc_match = re.search(r'DESCRIPTION:\s*(.+?)(?:\n(?:CATEGORY|SUBCATEGORY|BRAND|CONDITION|VALUE):|$)', response_text, re.IGNORECASE | re.DOTALL)
        category_match = re.search(r'CATEGORY:\s*(.+?)(?:\n|$)', response_text, re.IGNORECASE)
        subcategory_match = re.search(r'SUBCATEGORY:\s*(.+?)(?:\n|$)', response_text, re.IGNORECASE)
        brand_match = re.search(r'BRAND:\s*(.+?)(?:\n|$)', response_text, re.IGNORECASE)
        condition_match = re.search(r'CONDITION:\s*(.+?)(?:\n|$)', response_text, re.IGNORECASE)
        value_match = re.search(r'VALUE:\s*\$?([0-9]+\.?[0-9]*)', response_text, re.IGNORECASE)

        # Assign values with fallbacks
        parsed_data['name'] = name_match.group(1).strip() if name_match else "Unknown Item"
        parsed_data['description'] = desc_match.group(1).strip() if desc_match else "No description available"
        parsed_data['category'] = category_match.group(1).strip().lower() if category_match else "accessories"
        parsed_data['subcategory'] = subcategory_match.group(1).strip().lower() if subcategory_match else "item"
        parsed_data['brand'] = brand_match.group(1).strip() if brand_match else "Generic"
        parsed_data['condition'] = condition_match.group(1).strip().lower() if condition_match else "good"
        parsed_data['estimated_value'] = float(value_match.group(1)) if value_match else 10.0

        # Ensure condition is valid
        valid_conditions = ["new", "excellent", "good", "fair", "poor"]
        if parsed_data['condition'] not in valid_conditions:
            parsed_data['condition'] = "good"

        logger.info(f"Parsed data: {parsed_data}")

        return DepositAnalysisResponse(**parsed_data)

    except Exception as e:
        logger.error(f"AI Analysis failed: {str(e)}")
        # Provide fallback response
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}. Please try again or add the item manually."
        )


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


# ============ Transaction Endpoints ============
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    transaction_obj = Transaction(**transaction.dict())
    await db.transactions.insert_one(transaction_obj.dict())
    return transaction_obj

@api_router.get("/transactions/user/{user_id}", response_model=List[Transaction])
async def get_user_transactions(user_id: str):
    """
    Get all transactions for a user, combining:
    - Items deposited (from items collection)
    - Payments sent/received (from transactions collection)
    - Money spent at merchants (from transactions collection)
    """
    transactions_list = []

    # Get items as deposit transactions
    items = await db.items.find({"owner_id": user_id}).to_list(1000)
    for item in items:
        transactions_list.append({
            "transaction_id": f"deposit-{item['item_id']}",
            "user_id": user_id,
            "type": "deposit",
            "amount": item.get("value", 0),
            "item_id": item["item_id"],
            "item_details": {
                "brand": item.get("brand"),
                "subcategory": item.get("subcategory"),
                "category": item.get("category"),
                "condition": item.get("condition")
            },
            "status": "completed",
            "description": f"Deposited {item.get('brand', '')} {item.get('subcategory', '')}".strip(),
            "created_at": item.get("created_at", datetime.utcnow()),
            "updated_at": item.get("updated_at")
        })

    # Get payment and merchant transactions
    payment_transactions = await db.transactions.find({"user_id": user_id}).to_list(1000)
    for tx in payment_transactions:
        transactions_list.append(tx)

    # Sort by created_at descending (most recent first)
    transactions_list.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)

    return [Transaction(**tx) for tx in transactions_list]

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    transaction = await db.transactions.find_one({"transaction_id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return Transaction(**transaction)


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


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
