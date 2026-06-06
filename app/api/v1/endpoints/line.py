from fastapi import APIRouter, Request, Header, HTTPException
from app.services.line_service import LineService
from linebot.v3.exceptions import InvalidSignatureError

router = APIRouter()

@router.post("/webhook")
async def line_webhook(
    request: Request,
    x_line_signature: str = Header(None)
):
    """
    LINE Webhook endpoint to receive events.
    """
    if not x_line_signature:
        raise HTTPException(status_code=400, detail="Missing X-Line-Signature")
    
    body = await request.body()
    payload = body.decode("utf-8")
    
    try:
        await LineService.handle_webhook(payload, x_line_signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        print(f"Error handling webhook: {e}")
        # Return 200 even on error to avoid LINE retrying indefinitely 
        # but log it for debugging
        return {"status": "error", "message": str(e)}
    
    return {"status": "success"}
