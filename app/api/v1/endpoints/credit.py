from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from prisma.models import User

router = APIRouter()

@router.get("/wallet")
async def get_wallet(current_user: User = Depends(get_current_user)):
    """Credit system disabled for MVP. Wallet always shows zero balance."""
    return {"id": "mvp-wallet", "user_id": current_user.id, "balance": 0, "updated_at": None}

# ================================================================
# The endpoints below are temporarily disabled.
# Payment gateway integration will be added in a future phase.
# ================================================================

# @router.get("/history")
# async def get_credit_history(current_user: User = Depends(get_current_user)):
#     return []

# @router.get("/packages")
# async def list_packages():
#     return []

# @router.post("/purchase-package")
# async def purchase_package(req, current_user: User = Depends(get_current_user)):
#     return {"status": "disabled"}

# @router.post("/top-up")
# async def top_up(req, current_user: User = Depends(get_current_user)):
#     return {"status": "disabled"}
