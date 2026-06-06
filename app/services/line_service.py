from linebot.v3 import WebhookHandler
from linebot.v3.messaging import (
    Configuration,
    ApiClient,
    MessagingApi,
    ReplyMessageRequest,
    TextMessage
)
from linebot.v3.webhooks import MessageEvent, TextMessageContent, FollowEvent, ImageMessageContent
from app.core.config import settings
from app.core.database import db

configuration = Configuration(access_token=settings.LINE_MESSAGING_API_TOKEN)
handler = WebhookHandler(settings.LINE_CHANNEL_SECRET)

class LineService:
    @staticmethod
    async def handle_webhook(body: str, signature: str):
        handler.handle(body, signature)

@handler.add(MessageEvent, message=TextMessageContent)
def handle_message(event):
    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        user_message = event.message.text
        
        # Simple Echo Logic or Command Handling
        reply_text = f"คุณส่งข้อความว่า: {user_message}\nตอนนี้ระบบกำลังพัฒนาฟีเจอร์จองแม่บ้านอยู่นะครับ!"
        
        if "จอง" in user_message:
            reply_text = "สนใจจองแม่บ้านใช่ไหมครับ? สามารถกดเลือกแพ็กเกจที่เมนูได้เลย (กำลังเปิดระบบเร็วๆ นี้)"

        line_bot_api.reply_message_with_http_info(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text=reply_text)]
            )
        )

@handler.add(MessageEvent, message=ImageMessageContent)
def handle_image(event):
    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        line_uid = event.source.user_id
        
        # In a real app, we'd use MessagingApiBlob to get the binary content
        # For now, we'll just record the event with a placeholder URL
        # We need to run this async part carefully if handler is sync
        import asyncio
        
        async def record_slip():
            user = await db.user.find_first(where={"lineUid": line_uid})
            if user:
                await db.slipupload.create(
                    data={
                        "userId": user.id,
                        "imageUrl": f"line_blob_id_{event.message.id}",
                        "status": "PENDING"
                    }
                )
        
        # Run the async record in the background or event loop
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(record_slip())
            else:
                loop.run_until_complete(record_slip())
        except Exception as e:
            print(f"Error recording slip: {e}")

        reply_text = "ได้รับสลิปของคุณแล้วครับ! เจ้าหน้าที่จะทำการตรวจสอบและเพิ่มเครดิตให้โดยเร็วที่สุดครับ (ตรวจสอบได้ที่เมนู กระเป๋าเงิน)"
        
        line_bot_api.reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text=reply_text)]
            )
        )

@handler.add(FollowEvent)
def handle_follow(event):
    # Logic when user adds the bot
    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        line_bot_api.reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text="ยินดีต้อนรับสู่ MaidBooking! ✨\nบริการจองแม่บ้านออนไลน์ที่ง่ายที่สุด ขอบคุณที่เพิ่มเราเป็นเพื่อนครับ")]
            )
        )
