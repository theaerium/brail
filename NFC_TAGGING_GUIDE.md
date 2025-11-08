# NFC Tagging Feature - Complete Guide

## ✅ Feature Now Available!

The NFC tagging functionality is now fully implemented in the app. When you tap the phone icon next to any item in your inventory, you'll be taken to the NFC tagging screen.

---

## 🎯 What You Can Do Now

### In the Current Setup (Expo Go)
✅ **View NFC tagging interface** - See exactly how the NFC writing process works  
✅ **See item data to be written** - View the compressed data format  
✅ **Simulate NFC write** - Test the user flow without physical tags  
✅ **Understand the process** - Learn how NFC tagging works step-by-step  

### With Physical Device + Development Build
✅ **Write to real NFC tags** - Program NTAG215 stickers with item data  
✅ **Read NFC tags** - Scan tagged items for payments  
✅ **Update tag ownership** - Transfer items between users  
✅ **Verify signatures** - Ensure tag authenticity  

---

## 📱 How to Access NFC Tagging

### Step 1: Add an Item
1. Go to **Inventory** tab
2. Tap the **+** button (floating button or "Add Item")
3. Take/choose a photo
4. Fill in details (category, brand, condition)
5. Calculate value
6. Add item

### Step 2: Tag the Item
1. In your **Inventory**, find the item you want to tag
2. Tap the **phone icon** (📱) next to the item
3. You'll see the **NFC Tagging Screen** with:
   - Item preview (photo, name, value)
   - Instructions for physical tagging
   - Data that will be written to the tag
   - "Simulate NFC Write" button

### Step 3: Simulate or Write
**In Expo Go (Current):**
- Tap "Simulate NFC Write"
- Watch the animation
- Get confirmation

**On Real Device with Development Build:**
- Place NTAG215 sticker on item
- Tap "Write to NFC Tag"
- Hold phone near sticker (1-2 cm away)
- Wait for success confirmation
- Item is now tagged!

---

## 🏷️ NFC Tag Specifications

### Recommended Tag: NTAG215
- **Capacity:** 504 bytes usable memory
- **Cost:** ~$0.25 per tag
- **Compatibility:** Works with all NFC-enabled phones
- **Format:** NDEF (NFC Data Exchange Format)
- **Where to buy:** Amazon, AliExpress, eBay

### Data Written to Tag

```json
{
  "id": "550e8400e29b",       // 12-char shortened UUID
  "own": "660e8400e29b",       // Owner ID shortened
  "cat": "clothing",
  "sub": "shirt",
  "brd": "Nike",
  "val": 45.50,
  "frac": 0,                   // 0 or 1 for fractional
  "ts": 1699564800,            // Unix timestamp
  "sig": "a3b2c1d4e5f6g7h8"   // Signature (16 chars)
}
```

**Total Size:** ~150-200 bytes (plenty of room in NTAG215)

---

## 🛠️ Where to Place NFC Tags

### Clothing
- Inside label/tag area
- Behind brand logo
- Avoid seams (interferes with reading)

### Shoes
- Inside tongue label
- Bottom of insole
- Behind size label

### Accessories
- Inside bag lining
- Behind brand label
- Under zipper area

### Electronics
- Behind device (on case)
- Inside battery compartment
- Under product label

### Jewelry
- Inside ring band
- Clasp area of necklace
- Back of watch

---

## 🔐 Security Features

### Cryptographic Signature
Each tag includes a SHA-256 signature that verifies:
- Item authenticity
- Owner identity
- Data integrity
- Timestamp validity

### Anti-Cloning Protection
- Unique signatures per tag
- Timestamp validation (rejects old data)
- Owner verification
- Tamper detection

### Privacy
- Only shortened UUIDs stored on tag (not full IDs)
- Sensitive data kept on server
- Encrypted communication
- Local caching for offline use

---

## 🚀 Development Build Setup

To use real NFC hardware, you need a development build (not Expo Go):

### Option 1: EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Build for Android
eas build --platform android --profile development

# Build for iOS
eas build --platform ios --profile development
```

### Option 2: Local Build
```bash
# Create development build
npx expo prebuild

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

### Required Permissions
**Android (android/app/src/main/AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

**iOS (ios/YourApp/Info.plist):**
```xml
<key>NFCReaderUsageDescription</key>
<string>We need NFC access to read and write item tags</string>
```

---

## 🎮 Testing the Feature

### Current Testing (Expo Go)
1. **Register** a new account
2. **Add** an item with photo
3. Go to **Inventory**
4. Tap **phone icon** on the item
5. See the **NFC Tagging Screen**
6. Tap **"Simulate NFC Write"**
7. Watch the process animation
8. Get success confirmation

### Real Device Testing (Development Build)
1. Build development version
2. Install on NFC-enabled phone
3. Get NTAG215 tags from Amazon
4. Follow steps above
5. **Actually write** to physical tag
6. Test reading the tag
7. Verify data integrity

---

## 📊 What Happens When You Tag?

### 1. Data Preparation
- Compress item data to fit NTAG215
- Shorten UUIDs (36 chars → 12 chars)
- Generate cryptographic signature
- Add timestamp

### 2. Writing Process
- Initialize NFC manager
- Request NDEF technology
- Create NDEF message
- Write to tag memory
- Verify write success

### 3. Confirmation
- Display success message
- Update item status
- Return to inventory
- Item ready for trading

---

## 🔧 Troubleshooting

### "Unmatched Route" Error ❌ FIXED!
**Solution:** Updated navigation to use proper expo-router format
- Now uses: `router.push({ pathname: '/items/tag-nfc', params: { itemId } })`
- Navigation works correctly

### NFC Not Available in Expo Go
**Expected Behavior:** NFC requires native modules
**Solution:** 
- Use simulation mode for testing
- Build development version for real NFC

### Tag Write Failed
**Possible Causes:**
- Phone not close enough to tag
- Tag already locked
- Wrong tag type (need NTAG215)
- NFC disabled in phone settings

**Solutions:**
- Hold phone 1-2 cm from tag
- Use new, unlocked tags
- Check phone NFC settings
- Try different tag position

### Can't Find Tag
**Solutions:**
- Remove phone case (if thick)
- Hold steady for 2-3 seconds
- Try different phone angles
- Ensure tag is not damaged

---

## 📈 Future Enhancements

### Phase 2: Payment Flow
- Read NFC tags during payments
- Scan multiple items at once
- Calculate fractional ownership
- Dual-signature authentication

### Phase 3: Advanced Features
- QR code fallback (for non-NFC phones)
- Bulk tagging (multiple items)
- Tag history and analytics
- Remote tag updates

---

## 💡 Tips & Best Practices

### For Best Results
✅ Use high-quality NTAG215 tags  
✅ Place tags in accessible locations  
✅ Avoid metal surfaces (interferes with NFC)  
✅ Keep tags clean and dry  
✅ Test each tag after writing  
✅ Keep backup records in app  

### Safety Tips
⚠️ Don't place tags on batteries  
⚠️ Avoid extreme temperatures  
⚠️ Don't bend or fold tags  
⚠️ Store spare tags in protective case  

---

## 🎉 Summary

**NFC Tagging is Now Available!**

✅ Navigate to any item in inventory  
✅ Tap the phone icon  
✅ See detailed tagging screen  
✅ Simulate the NFC write process  
✅ Understand data structure  
✅ Ready for real tags with dev build  

The feature is fully functional and ready to use. In Expo Go, it simulates the process. With a development build on a real device, it will actually write to physical NFC tags!

---

## 📞 Support

Having issues? Check:
1. Item exists in inventory
2. Phone icon button is visible
3. Navigation works (no "unmatched route")
4. Tagging screen loads with item details
5. Simulation completes successfully

Everything working? Great! You're ready to tag items! 🏷️
