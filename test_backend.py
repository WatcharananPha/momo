import requests
import time
import json

BASE_URL = "http://localhost:8001/api/v1"

def test_full_backend_flow():
    print("🚀 Starting Comprehensive Backend Test...")

    # 1. Create Guest Session
    print("\n1. Creating Guest Session...")
    resp = requests.get(f"{BASE_URL}/auth/guest")
    assert resp.status_code == 200
    auth_data = resp.json()
    token = auth_data["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✅ Guest Session Created. Token: {token[:20]}...")

    # 2. Join Membership (Award Onboarding Points)
    print("\n2. Joining Membership (Onboarding Points)...")
    resp = requests.post(f"{BASE_URL}/points/join", headers=headers)
    assert resp.status_code == 200
    points_awarded = resp.json()
    print(f"✅ Points Awarded: {points_awarded}")

    # 3. Check Point Balance
    print("\n3. Checking Point Balance...")
    resp = requests.get(f"{BASE_URL}/points/balance/me", headers=headers)
    assert resp.status_code == 200
    balance = resp.json()
    print(f"✅ Balance: {balance['availablePoints']} points")
    assert balance['availablePoints'] >= points_awarded

    # 4. List Packages
    print("\n4. Listing Subscription Packages...")
    resp = requests.get(f"{BASE_URL}/credit/packages", headers=headers)
    assert resp.status_code == 200
    packages = resp.json()
    print(f"✅ Found {len(packages)} packages")
    package_id = packages[0]['id']
    print(f"Selected Package: {packages[0]['name']} ({packages[0]['credits']} credits)")

    # 5. Purchase Package (Credit Top-up)
    print("\n5. Purchasing Package...")
    resp = requests.post(f"{BASE_URL}/credit/purchase-package", json={"package_id": package_id}, headers=headers)
    assert resp.status_code == 200
    print(f"✅ Package purchased successfully")

    # 6. Check Credit Balance
    print("\n6. Checking Credit Wallet...")
    resp = requests.get(f"{BASE_URL}/credit/wallet", headers=headers)
    assert resp.status_code == 200
    wallet = resp.json()
    print(f"✅ Credit Balance: {wallet['balance']}")
    assert wallet['balance'] >= packages[0]['credits']

    # 7. Booking Flow - Estimation
    print("\n7. Booking Flow - Estimation...")
    booking_data = {
        "type": "CLEANING",
        "scheduled_at": "2026-06-01T10:00:00Z",
        "location_name": "User's Apartment",
        "party_size": 2,
        "notes": "Door code is 1234"
    }
    resp = requests.post(f"{BASE_URL}/bookings/estimate", json=booking_data, headers=headers)
    assert resp.status_code == 200
    estimate = resp.json()
    print(f"✅ Estimation: {estimate['creditCost']} credits")

    # 8. Booking Flow - Confirm and Match
    print("\n8. Booking Flow - Confirm and Match...")
    resp = requests.post(f"{BASE_URL}/bookings/confirm", json=booking_data, headers=headers)
    assert resp.status_code == 200
    booking = resp.json()
    booking_id = booking["id"]
    print(f"✅ Matched with Maid: {booking['maidId']} (Ref: {booking['referenceCode']})")

    # 9. Booking Flow - Reroll
    print("\n9. Booking Flow - Reroll...")
    resp = requests.post(f"{BASE_URL}/bookings/{booking_id}/reroll", headers=headers)
    assert resp.status_code == 200
    booking = resp.json()
    print(f"✅ Rerolled! New Maid: {booking['maidId']}, Reroll Count: {booking['rerollCount']}")

    # 10. Booking Flow - Final Confirmation (Deduct Credits)
    print("\n10. Booking Flow - Final Confirmation...")
    resp = requests.post(f"{BASE_URL}/bookings/{booking_id}/final-confirm", headers=headers)
    assert resp.status_code == 200
    booking = resp.json()
    print(f"✅ Booking CONFIRMED. Status: {booking['status']}")

    # 11. Check Credit Balance after Deduction
    print("\n11. Checking Credit Wallet after deduction...")
    resp = requests.get(f"{BASE_URL}/credit/wallet", headers=headers)
    new_wallet = resp.json()
    print(f"✅ New Credit Balance: {new_wallet['balance']}")
    assert new_wallet['balance'] < wallet['balance']

    # 12. Maid App - Status Updates
    print("\n12. Maid App - Updating Service Status...")
    statuses = ["ARRIVED", "IN_PROGRESS", "COMPLETED"]
    for s in statuses:
        resp = requests.patch(f"{BASE_URL}/bookings/{booking_id}/status", json={"status": s}, headers=headers)
        if resp.status_code != 200:
            print(f"❌ Failed to update status to {s}: {resp.status_code} - {resp.text}")
        assert resp.status_code == 200
        print(f"✅ Status updated to: {s}")

    # 13. Gamification - Lucky Wheel
    print("\n13. Gamification - Lucky Wheel...")
    resp = requests.get(f"{BASE_URL}/gamification/campaigns/active")
    assert resp.status_code == 200
    campaigns = resp.json()
    if campaigns:
        campaign_id = campaigns[0]['id']
        print(f"✅ Found active campaign: {campaigns[0]['name']}")
        resp = requests.post(f"{BASE_URL}/gamification/lucky-wheel/{campaign_id}/spin", headers=headers)
        assert resp.status_code == 200
        reward = resp.json()
        print(f"✅ Won reward: {reward['name']} (Type: {reward['type']}, Value: {reward['value']})")
    else:
        print("⚠️ No active campaigns found for Lucky Wheel test")
    
    print("\n🎉 All tests passed!")

if __name__ == "__main__":
    try:
        test_full_backend_flow()
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
