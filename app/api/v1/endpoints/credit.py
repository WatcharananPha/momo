from fastapi import APIRouter, Depends
from app.services.credit_service import CreditService
from app.schemas.credit import CreditWalletResponse, TopUpRequest, PurchasePackageRequest
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/wallet", response_model=CreditWalletResponse)
async def get_wallet(current_user = Depends(get_current_user)):
    """Get current user credit wallet balance"""
    return await CreditService.get_wallet(current_user.id)

@router.post("/purchase-package")
async def purchase_package(req: PurchasePackageRequest, current_user = Depends(get_current_user)):
    """Purchase a subscription package and top up credits"""
    return await CreditService.purchase_subscription(current_user.id, req.package_id)

@router.post("/top-up", response_model=CreditWalletResponse)
async def top_up(req: TopUpRequest, current_user = Depends(get_current_user)):
    """Manual top-up (for development/admin)"""
    return await CreditService.top_up(current_user.id, req.amount)
