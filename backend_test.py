#!/usr/bin/env python3
"""
NFC Trading App Backend API Testing Suite
Tests all backend endpoints comprehensively
"""

import requests
import json
import uuid
import base64
from datetime import datetime
import sys

# Backend URL from environment configuration
BACKEND_URL = "https://screen-update.preview.emergentagent.com/api"

class NFCTradingAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_users = []
        self.test_items = []
        self.test_trades = []
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message="", response=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.status_code} - {response.text}")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
        print()
    
    def generate_test_data(self):
        """Generate realistic test data"""
        return {
            "user1": {
                "username": f"alex_trader_{uuid.uuid4().hex[:8]}",
                "pin_hash": "hashed_pin_123456"
            },
            "user2": {
                "username": f"sarah_collector_{uuid.uuid4().hex[:8]}",
                "pin_hash": "hashed_pin_789012"
            },
            "item_clothing": {
                "category": "clothing",
                "subcategory": "shirt",
                "brand": "Nike",
                "condition": "excellent",
                "photo": base64.b64encode(b"fake_image_data").decode(),
                "value": 45.99
            },
            "item_shoes": {
                "category": "shoes", 
                "subcategory": "sneakers",
                "brand": "Adidas",
                "condition": "good",
                "photo": base64.b64encode(b"fake_shoe_image").decode(),
                "value": 89.99
            },
            "item_electronics": {
                "category": "electronics",
                "subcategory": "phone", 
                "brand": "Apple",
                "condition": "new",
                "photo": base64.b64encode(b"fake_phone_image").decode(),
                "value": 799.99
            }
        }
    
    # ============ Authentication Tests ============
    
    def test_user_registration_valid(self):
        """Test user registration with valid data"""
        test_data = self.generate_test_data()
        
        try:
            response = requests.post(
                f"{self.base_url}/users/register",
                json=test_data["user1"],
                timeout=10
            )
            
            if response.status_code == 200:
                user_data = response.json()
                self.test_users.append(user_data)
                self.log_result("User Registration (Valid)", True, f"User created: {user_data['username']}")
                return user_data
            else:
                self.log_result("User Registration (Valid)", False, f"Expected 200, got {response.status_code}", response)
                return None
                
        except Exception as e:
            self.log_result("User Registration (Valid)", False, f"Exception: {str(e)}")
            return None
    
    def test_user_registration_duplicate(self):
        """Test user registration with duplicate username"""
        if not self.test_users:
            self.log_result("User Registration (Duplicate)", False, "No existing user to test duplicate")
            return
        
        try:
            duplicate_user = {
                "username": self.test_users[0]["username"],
                "pin_hash": "different_pin_hash"
            }
            
            response = requests.post(
                f"{self.base_url}/users/register",
                json=duplicate_user,
                timeout=10
            )
            
            if response.status_code == 400:
                self.log_result("User Registration (Duplicate)", True, "Correctly rejected duplicate username")
            else:
                self.log_result("User Registration (Duplicate)", False, f"Expected 400, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("User Registration (Duplicate)", False, f"Exception: {str(e)}")
    
    def test_user_registration_invalid(self):
        """Test user registration with invalid data"""
        invalid_cases = [
            ({}, "Empty data"),
            ({"username": ""}, "Empty username"),
            ({"pin_hash": "123"}, "Missing username"),
            ({"username": "test"}, "Missing pin_hash")
        ]
        
        for invalid_data, case_name in invalid_cases:
            try:
                response = requests.post(
                    f"{self.base_url}/users/register",
                    json=invalid_data,
                    timeout=10
                )
                
                if response.status_code in [400, 422]:
                    self.log_result(f"User Registration Invalid ({case_name})", True, "Correctly rejected invalid data")
                else:
                    self.log_result(f"User Registration Invalid ({case_name})", False, f"Expected 400/422, got {response.status_code}", response)
                    
            except Exception as e:
                self.log_result(f"User Registration Invalid ({case_name})", False, f"Exception: {str(e)}")
    
    def test_user_login_valid(self):
        """Test user login with correct credentials"""
        if not self.test_users:
            self.log_result("User Login (Valid)", False, "No test user available")
            return
        
        try:
            login_data = {
                "username": self.test_users[0]["username"],
                "pin_hash": self.test_users[0]["pin_hash"]
            }
            
            response = requests.post(
                f"{self.base_url}/users/login",
                json=login_data,
                timeout=10
            )
            
            if response.status_code == 200:
                user_data = response.json()
                self.log_result("User Login (Valid)", True, f"Login successful for: {user_data['username']}")
            else:
                self.log_result("User Login (Valid)", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("User Login (Valid)", False, f"Exception: {str(e)}")
    
    def test_user_login_invalid(self):
        """Test user login with incorrect credentials"""
        invalid_cases = [
            ({"username": "nonexistent_user", "pin_hash": "wrong_pin"}, "Nonexistent user"),
            ({"username": self.test_users[0]["username"] if self.test_users else "test", "pin_hash": "wrong_pin"}, "Wrong PIN"),
            ({}, "Empty credentials")
        ]
        
        for invalid_data, case_name in invalid_cases:
            try:
                response = requests.post(
                    f"{self.base_url}/users/login",
                    json=invalid_data,
                    timeout=10
                )
                
                if response.status_code in [401, 422]:
                    self.log_result(f"User Login Invalid ({case_name})", True, "Correctly rejected invalid credentials")
                else:
                    self.log_result(f"User Login Invalid ({case_name})", False, f"Expected 401/422, got {response.status_code}", response)
                    
            except Exception as e:
                self.log_result(f"User Login Invalid ({case_name})", False, f"Exception: {str(e)}")
    
    def test_get_user_details(self):
        """Test getting user details"""
        if not self.test_users:
            self.log_result("Get User Details", False, "No test user available")
            return
        
        try:
            user_id = self.test_users[0]["user_id"]
            response = requests.get(
                f"{self.base_url}/users/{user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                user_data = response.json()
                self.log_result("Get User Details", True, f"Retrieved user: {user_data['username']}")
            else:
                self.log_result("Get User Details", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get User Details", False, f"Exception: {str(e)}")
    
    def test_get_user_details_invalid(self):
        """Test getting user details with invalid ID"""
        try:
            fake_id = str(uuid.uuid4())
            response = requests.get(
                f"{self.base_url}/users/{fake_id}",
                timeout=10
            )
            
            if response.status_code == 404:
                self.log_result("Get User Details (Invalid ID)", True, "Correctly returned 404 for nonexistent user")
            else:
                self.log_result("Get User Details (Invalid ID)", False, f"Expected 404, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get User Details (Invalid ID)", False, f"Exception: {str(e)}")
    
    # ============ Item Management Tests ============
    
    def test_create_item_clothing(self):
        """Test creating clothing item"""
        if not self.test_users:
            self.log_result("Create Item (Clothing)", False, "No test user available")
            return
        
        test_data = self.generate_test_data()
        item_data = test_data["item_clothing"].copy()
        item_data["owner_id"] = self.test_users[0]["user_id"]
        
        try:
            response = requests.post(
                f"{self.base_url}/items",
                json=item_data,
                timeout=10
            )
            
            if response.status_code == 200:
                item = response.json()
                self.test_items.append(item)
                self.log_result("Create Item (Clothing)", True, f"Created {item['brand']} {item['subcategory']}")
                return item
            else:
                self.log_result("Create Item (Clothing)", False, f"Expected 200, got {response.status_code}", response)
                return None
                
        except Exception as e:
            self.log_result("Create Item (Clothing)", False, f"Exception: {str(e)}")
            return None
    
    def test_create_item_shoes(self):
        """Test creating shoes item"""
        if not self.test_users:
            self.log_result("Create Item (Shoes)", False, "No test user available")
            return
        
        test_data = self.generate_test_data()
        item_data = test_data["item_shoes"].copy()
        item_data["owner_id"] = self.test_users[0]["user_id"]
        
        try:
            response = requests.post(
                f"{self.base_url}/items",
                json=item_data,
                timeout=10
            )
            
            if response.status_code == 200:
                item = response.json()
                self.test_items.append(item)
                self.log_result("Create Item (Shoes)", True, f"Created {item['brand']} {item['subcategory']}")
                return item
            else:
                self.log_result("Create Item (Shoes)", False, f"Expected 200, got {response.status_code}", response)
                return None
                
        except Exception as e:
            self.log_result("Create Item (Shoes)", False, f"Exception: {str(e)}")
            return None
    
    def test_create_item_electronics(self):
        """Test creating electronics item"""
        if not self.test_users:
            self.log_result("Create Item (Electronics)", False, "No test user available")
            return
        
        test_data = self.generate_test_data()
        item_data = test_data["item_electronics"].copy()
        item_data["owner_id"] = self.test_users[0]["user_id"]
        
        try:
            response = requests.post(
                f"{self.base_url}/items",
                json=item_data,
                timeout=10
            )
            
            if response.status_code == 200:
                item = response.json()
                self.test_items.append(item)
                self.log_result("Create Item (Electronics)", True, f"Created {item['brand']} {item['subcategory']}")
                return item
            else:
                self.log_result("Create Item (Electronics)", False, f"Expected 200, got {response.status_code}", response)
                return None
                
        except Exception as e:
            self.log_result("Create Item (Electronics)", False, f"Exception: {str(e)}")
            return None
    
    def test_create_item_invalid(self):
        """Test creating item with invalid data"""
        invalid_cases = [
            ({}, "Empty data"),
            ({"category": "clothing"}, "Missing required fields"),
            ({"owner_id": "invalid", "category": "clothing", "subcategory": "shirt", "brand": "Nike", "condition": "new", "photo": "test", "value": -10}, "Negative value")
        ]
        
        for invalid_data, case_name in invalid_cases:
            try:
                response = requests.post(
                    f"{self.base_url}/items",
                    json=invalid_data,
                    timeout=10
                )
                
                if response.status_code in [400, 422]:
                    self.log_result(f"Create Item Invalid ({case_name})", True, "Correctly rejected invalid data")
                else:
                    self.log_result(f"Create Item Invalid ({case_name})", False, f"Expected 400/422, got {response.status_code}", response)
                    
            except Exception as e:
                self.log_result(f"Create Item Invalid ({case_name})", False, f"Exception: {str(e)}")
    
    def test_get_user_items(self):
        """Test getting user's items"""
        if not self.test_users:
            self.log_result("Get User Items", False, "No test user available")
            return
        
        try:
            user_id = self.test_users[0]["user_id"]
            response = requests.get(
                f"{self.base_url}/items/user/{user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                items = response.json()
                self.log_result("Get User Items", True, f"Retrieved {len(items)} items for user")
            else:
                self.log_result("Get User Items", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get User Items", False, f"Exception: {str(e)}")
    
    def test_get_single_item(self):
        """Test getting single item"""
        if not self.test_items:
            self.log_result("Get Single Item", False, "No test item available")
            return
        
        try:
            item_id = self.test_items[0]["item_id"]
            response = requests.get(
                f"{self.base_url}/items/{item_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                item = response.json()
                self.log_result("Get Single Item", True, f"Retrieved item: {item['brand']} {item['subcategory']}")
            else:
                self.log_result("Get Single Item", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Single Item", False, f"Exception: {str(e)}")
    
    def test_get_single_item_invalid(self):
        """Test getting single item with invalid ID"""
        try:
            fake_id = str(uuid.uuid4())
            response = requests.get(
                f"{self.base_url}/items/{fake_id}",
                timeout=10
            )
            
            if response.status_code == 404:
                self.log_result("Get Single Item (Invalid ID)", True, "Correctly returned 404 for nonexistent item")
            else:
                self.log_result("Get Single Item (Invalid ID)", False, f"Expected 404, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get Single Item (Invalid ID)", False, f"Exception: {str(e)}")
    
    def test_update_item(self):
        """Test updating item"""
        if not self.test_items:
            self.log_result("Update Item", False, "No test item available")
            return
        
        try:
            item_id = self.test_items[0]["item_id"]
            update_data = {
                "share_percentage": 0.75
            }
            
            response = requests.put(
                f"{self.base_url}/items/{item_id}",
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 200:
                updated_item = response.json()
                self.log_result("Update Item", True, f"Updated share percentage to {updated_item['share_percentage']}")
            else:
                self.log_result("Update Item", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Update Item", False, f"Exception: {str(e)}")
    
    def test_update_item_invalid(self):
        """Test updating item with invalid ID"""
        try:
            fake_id = str(uuid.uuid4())
            update_data = {"share_percentage": 0.5}
            
            response = requests.put(
                f"{self.base_url}/items/{fake_id}",
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 404:
                self.log_result("Update Item (Invalid ID)", True, "Correctly returned 404 for nonexistent item")
            else:
                self.log_result("Update Item (Invalid ID)", False, f"Expected 404, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Update Item (Invalid ID)", False, f"Exception: {str(e)}")
    
    def test_delete_item(self):
        """Test deleting item"""
        if len(self.test_items) < 2:
            self.log_result("Delete Item", False, "Need at least 2 test items")
            return
        
        try:
            # Delete the last item to keep others for further tests
            item_to_delete = self.test_items[-1]
            item_id = item_to_delete["item_id"]
            
            response = requests.delete(
                f"{self.base_url}/items/{item_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                self.test_items.remove(item_to_delete)
                self.log_result("Delete Item", True, "Item deleted successfully")
            else:
                self.log_result("Delete Item", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Delete Item", False, f"Exception: {str(e)}")
    
    def test_delete_item_invalid(self):
        """Test deleting item with invalid ID"""
        try:
            fake_id = str(uuid.uuid4())
            response = requests.delete(
                f"{self.base_url}/items/{fake_id}",
                timeout=10
            )
            
            if response.status_code == 404:
                self.log_result("Delete Item (Invalid ID)", True, "Correctly returned 404 for nonexistent item")
            else:
                self.log_result("Delete Item (Invalid ID)", False, f"Expected 404, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Delete Item (Invalid ID)", False, f"Exception: {str(e)}")
    
    # ============ Valuation Tests ============
    
    def test_mock_valuation_clothing(self):
        """Test mock valuation for clothing"""
        try:
            valuation_data = {
                "category": "clothing",
                "subcategory": "shirt",
                "brand": "Nike",
                "condition": "excellent"
            }
            
            response = requests.post(
                f"{self.base_url}/valuations/mock",
                json=valuation_data,
                timeout=10
            )
            
            if response.status_code == 200:
                valuation = response.json()
                expected_keys = ["value", "currency", "base_value", "condition_multiplier"]
                if all(key in valuation for key in expected_keys):
                    self.log_result("Mock Valuation (Clothing)", True, f"Valuation: ${valuation['value']} USD")
                else:
                    self.log_result("Mock Valuation (Clothing)", False, f"Missing expected keys in response")
            else:
                self.log_result("Mock Valuation (Clothing)", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Mock Valuation (Clothing)", False, f"Exception: {str(e)}")
    
    def test_mock_valuation_shoes(self):
        """Test mock valuation for shoes"""
        try:
            valuation_data = {
                "category": "shoes",
                "subcategory": "sneakers",
                "brand": "Adidas",
                "condition": "good"
            }
            
            response = requests.post(
                f"{self.base_url}/valuations/mock",
                json=valuation_data,
                timeout=10
            )
            
            if response.status_code == 200:
                valuation = response.json()
                self.log_result("Mock Valuation (Shoes)", True, f"Valuation: ${valuation['value']} USD")
            else:
                self.log_result("Mock Valuation (Shoes)", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Mock Valuation (Shoes)", False, f"Exception: {str(e)}")
    
    def test_mock_valuation_electronics(self):
        """Test mock valuation for electronics"""
        try:
            valuation_data = {
                "category": "electronics",
                "subcategory": "phone",
                "brand": "Apple",
                "condition": "new"
            }
            
            response = requests.post(
                f"{self.base_url}/valuations/mock",
                json=valuation_data,
                timeout=10
            )
            
            if response.status_code == 200:
                valuation = response.json()
                self.log_result("Mock Valuation (Electronics)", True, f"Valuation: ${valuation['value']} USD")
            else:
                self.log_result("Mock Valuation (Electronics)", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Mock Valuation (Electronics)", False, f"Exception: {str(e)}")
    
    def test_mock_valuation_accessories(self):
        """Test mock valuation for accessories"""
        try:
            valuation_data = {
                "category": "accessories",
                "subcategory": "watch",
                "brand": "Rolex",
                "condition": "excellent"
            }
            
            response = requests.post(
                f"{self.base_url}/valuations/mock",
                json=valuation_data,
                timeout=10
            )
            
            if response.status_code == 200:
                valuation = response.json()
                self.log_result("Mock Valuation (Accessories)", True, f"Valuation: ${valuation['value']} USD")
            else:
                self.log_result("Mock Valuation (Accessories)", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Mock Valuation (Accessories)", False, f"Exception: {str(e)}")
    
    # ============ Trade Tests ============
    
    def test_create_trade(self):
        """Test creating a trade"""
        if len(self.test_users) < 2:
            # Create second user for trade
            test_data = self.generate_test_data()
            try:
                response = requests.post(
                    f"{self.base_url}/users/register",
                    json=test_data["user2"],
                    timeout=10
                )
                if response.status_code == 200:
                    self.test_users.append(response.json())
                else:
                    self.log_result("Create Trade", False, "Could not create second user for trade")
                    return
            except Exception as e:
                self.log_result("Create Trade", False, f"Exception creating second user: {str(e)}")
                return
        
        if not self.test_items:
            self.log_result("Create Trade", False, "No test items available for trade")
            return
        
        try:
            trade_data = {
                "payer_id": self.test_users[0]["user_id"],
                "payee_id": self.test_users[1]["user_id"],
                "items": [{
                    "item_id": self.test_items[0]["item_id"],
                    "share_percentage": 0.5,
                    "value": self.test_items[0]["value"],
                    "previous_owner": self.test_users[0]["user_id"],
                    "new_owner": self.test_users[1]["user_id"]
                }],
                "total_value": self.test_items[0]["value"] * 0.5,
                "payer_signature": "digital_signature_payer",
                "payee_signature": "digital_signature_payee"
            }
            
            response = requests.post(
                f"{self.base_url}/trades",
                json=trade_data,
                timeout=10
            )
            
            if response.status_code == 200:
                trade = response.json()
                self.test_trades.append(trade)
                self.log_result("Create Trade", True, f"Trade created: ${trade['total_value']}")
            else:
                self.log_result("Create Trade", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Create Trade", False, f"Exception: {str(e)}")
    
    def test_get_user_trades(self):
        """Test getting user trades"""
        if not self.test_users:
            self.log_result("Get User Trades", False, "No test user available")
            return
        
        try:
            user_id = self.test_users[0]["user_id"]
            response = requests.get(
                f"{self.base_url}/trades/user/{user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                trades = response.json()
                self.log_result("Get User Trades", True, f"Retrieved {len(trades)} trades for user")
            else:
                self.log_result("Get User Trades", False, f"Expected 200, got {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Get User Trades", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting NFC Trading App Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication Tests
        print("\n📋 AUTHENTICATION TESTS")
        print("-" * 30)
        self.test_user_registration_valid()
        self.test_user_registration_duplicate()
        self.test_user_registration_invalid()
        self.test_user_login_valid()
        self.test_user_login_invalid()
        self.test_get_user_details()
        self.test_get_user_details_invalid()
        
        # Item Management Tests
        print("\n📦 ITEM MANAGEMENT TESTS")
        print("-" * 30)
        self.test_create_item_clothing()
        self.test_create_item_shoes()
        self.test_create_item_electronics()
        self.test_create_item_invalid()
        self.test_get_user_items()
        self.test_get_single_item()
        self.test_get_single_item_invalid()
        self.test_update_item()
        self.test_update_item_invalid()
        self.test_delete_item()
        self.test_delete_item_invalid()
        
        # Valuation Tests
        print("\n💰 VALUATION TESTS")
        print("-" * 30)
        self.test_mock_valuation_clothing()
        self.test_mock_valuation_shoes()
        self.test_mock_valuation_electronics()
        self.test_mock_valuation_accessories()
        
        # Trade Tests
        print("\n🔄 TRADE TESTS")
        print("-" * 30)
        self.test_create_trade()
        self.test_get_user_trades()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📈 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results

if __name__ == "__main__":
    tester = NFCTradingAPITester()
    results = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if results['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)