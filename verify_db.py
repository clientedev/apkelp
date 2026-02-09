"""
Verify PostgreSQL database tables
Run this to check if tables were actually created
"""
from app import app, db
from sqlalchemy import inspect, text
import logging

logging.basicConfig(level=logging.INFO)

def verify_database():
    """Verify database connection and tables"""
    with app.app_context():
        try:
            # Test connection
            logging.info("🔍 Testing database connection...")
            result = db.session.execute(text('SELECT version()'))
            version = result.fetchone()[0]
            logging.info(f"✅ PostgreSQL Version: {version}")
            
            # List all tables
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            logging.info(f"\n📊 Found {len(tables)} tables in database:")
            for table in sorted(tables):
                # Count rows in each table
                try:
                    count_result = db.session.execute(text(f'SELECT COUNT(*) FROM "{table}"'))
                    count = count_result.fetchone()[0]
                    logging.info(f"  ✓ {table}: {count} rows")
                except Exception as e:
                    logging.warning(f"  ⚠ {table}: Error counting rows - {e}")
            
            # Check specific important tables
            important_tables = ['users', 'projetos', 'relatorios', 'visitas']
            logging.info(f"\n🔍 Checking important tables:")
            for table in important_tables:
                if table in tables:
                    logging.info(f"  ✅ {table} exists")
                else:
                    logging.error(f"  ❌ {table} MISSING!")
            
            # Show database URL (masked)
            db_url = str(db.engine.url)
            masked_url = db_url.replace(db.engine.url.password or '', '***')
            logging.info(f"\n🔗 Database URL: {masked_url}")
            
            return True
            
        except Exception as e:
            logging.error(f"❌ Database verification failed: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = verify_database()
    exit(0 if success else 1)
