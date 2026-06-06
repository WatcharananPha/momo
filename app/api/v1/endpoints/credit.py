from fastapi import APIRouter, Depends
from typing import List
from app.services.credit_service import CreditService
from app.schemas.credit import CreditWalletResponse, TopUpRequest, PurchasePackageRequest, CreditTransactionResponse
from app.api.deps import get_current_user
from prisma.models import User

router = APIRouter()

@router.get("/wallet", response_model=CreditWalletResponse)
async def get_wallet(current_user: User = Depends(get_current_user)):
    """Get current user credit wallet balance"""
    return await CreditService.get_wallet(current_user.id)

@router.get("/history", response_model=List[CreditTransactionResponse])
async def get_credit_history(current_user: User = Depends(get_current_user)):
    """Get credit transaction history for current user"""
    return await CreditService.get_history(current_user.id)

@router.get("/packages")
async def list_packages():
    """List all available subscription packages"""
    return await CreditService.get_packages()

@router.post("/purchase-package")
async def purchase_package(req: PurchasePackageRequest, current_user: User = Depends(get_current_user)):
    """Purchase a subscription package and top up credits"""
    return await CreditService.purchase_subscription(current_user.id, req.package_id, req.omise_token)

@router.post("/top-up", response_model=CreditWalletResponse)
async def top_up(req: TopUpRequest, current_user: User = Depends(get_current_user)):
    """Manual top-up (for development/admin)"""
    return await CreditService.top_up(current_user.id, req.amount)
