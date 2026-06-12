import asyncio
import logging
from dotenv import load_dotenv

# Load env variables
load_dotenv()

from app.core.database import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def clear_database():
    await db.connect()
    try:
        logger.info("Starting database cleanup (removing all mockup/test data)...")
        
        # Deleting in order to respect foreign key constraints
        deleted_reviews = await db.review.delete_many()
        logger.info(f"Deleted {deleted_reviews} reviews.")
        
        deleted_payments = await db.payment.delete_many()
        logger.info(f"Deleted {deleted_payments} payments.")
        
        deleted_bookings = await db.booking.delete_many()
        logger.info(f"Deleted {deleted_bookings} bookings.")
        
        deleted_maid_skills = await db.maidskill.delete_many()
        logger.info(f"Deleted {deleted_maid_skills} maid skills.")
        
        deleted_maids = await db.maid.delete_many()
        logger.info(f"Deleted {deleted_maids} maids.")
        
        deleted_credit_txs = await db.credittransaction.delete_many()
        logger.info(f"Deleted {deleted_credit_txs} credit transactions.")
        
        deleted_credit_wallets = await db.creditwallet.delete_many()
        logger.info(f"Deleted {deleted_credit_wallets} credit wallets.")
        
        deleted_packages = await db.creditpackage.delete_many()
        logger.info(f"Deleted {deleted_packages} credit packages.")
        
        deleted_point_txs = await db.pointtransaction.delete_many()
        logger.info(f"Deleted {deleted_point_txs} point transactions.")
        
        deleted_point_balances = await db.userpointbalance.delete_many()
        logger.info(f"Deleted {deleted_point_balances} user point balances.")
        
        deleted_point_rules = await db.pointrule.delete_many()
        logger.info(f"Deleted {deleted_point_rules} point rules.")
        
        deleted_campaign_rewards = await db.campaignreward.delete_many()
        logger.info(f"Deleted {deleted_campaign_rewards} campaign rewards.")
        
        deleted_campaigns = await db.campaign.delete_many()
        logger.info(f"Deleted {deleted_campaigns} campaigns.")
        
        deleted_cust_tags = await db.customertag.delete_many()
        logger.info(f"Deleted {deleted_cust_tags} customer tags.")
        
        deleted_slips = await db.slipupload.delete_many()
        logger.info(f"Deleted {deleted_slips} slips.")
        
        deleted_logs = await db.notificationlog.delete_many()
        logger.info(f"Deleted {deleted_logs} notification logs.")
        
        deleted_tier_rules = await db.tierrule.delete_many()
        logger.info(f"Deleted {deleted_tier_rules} tier rules.")
        
        deleted_guest_sessions = await db.guestsession.delete_many()
        logger.info(f"Deleted {deleted_guest_sessions} guest sessions.")
        
        deleted_memberships = await db.membership.delete_many()
        logger.info(f"Deleted {deleted_memberships} memberships.")
        
        deleted_users = await db.user.delete_many()
        logger.info(f"Deleted {deleted_users} users.")
        
        logger.info("Database cleanup completed successfully! All tables are empty. 🧹")
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(clear_database())
