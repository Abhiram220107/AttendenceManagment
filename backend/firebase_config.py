import os
import json
import uuid
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check for Firebase credentials file
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), 'firebase-key.json')
use_firebase = False

db = None
bucket = None

# If the credentials file exists, try initializing Firebase
if os.path.exists(CREDENTIALS_FILE):
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore, storage
        
        logger.info("Firebase key file found. Initializing Firebase Admin SDK...")
        
        # Load credentials and configuration
        cred = credentials.Certificate(CREDENTIALS_FILE)
        
        # Read bucket name from env or default to project id
        with open(CREDENTIALS_FILE, 'r') as f:
            cred_data = json.load(f)
            project_id = cred_data.get('project_id', '')
        
        bucket_name = os.environ.get('FIREBASE_STORAGE_BUCKET') or f"{project_id}.appspot.com"
        
        # Initialize Firebase App
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {
                'storageBucket': bucket_name
            })
            
        db = firestore.client()
        bucket = storage.bucket()
        use_firebase = True
        logger.info(f"Firebase successfully initialized with project '{project_id}' and bucket '{bucket_name}'.")
        
    except Exception as e:
        logger.error(f"Error initializing Firebase Admin SDK: {e}. Falling back to Mock Database.")
else:
    logger.warning("No firebase-key.json found in backend/ directory. Running in local mock mode.")

# Define Local Mock implementations if Firebase is not used
MOCK_DB_DIR = os.path.join(os.path.dirname(__file__), 'mock_db')
MOCK_STORAGE_DIR = os.path.join(os.path.dirname(__file__), 'mock_storage')

if not use_firebase:
    os.makedirs(MOCK_DB_DIR, exist_ok=True)
    os.makedirs(MOCK_STORAGE_DIR, exist_ok=True)
    
    class MockDocumentSnapshot:
        def __init__(self, doc_id, data):
            self.id = doc_id
            self._data = data
            self.exists = data is not None
            
        def to_dict(self):
            return self._data
            
    class MockDocumentReference:
        def __init__(self, collection_path, doc_id):
            self.collection_path = collection_path
            self.id = doc_id
            self.file_path = os.path.join(MOCK_DB_DIR, f"{collection_path}_{doc_id}.json")
            
        def get(self):
            if os.path.exists(self.file_path):
                try:
                    with open(self.file_path, 'r') as f:
                        data = json.load(f)
                    return MockDocumentSnapshot(self.id, data)
                except Exception:
                    pass
            return MockDocumentSnapshot(self.id, None)
            
        def set(self, data, merge=True):
            existing = {}
            if merge and os.path.exists(self.file_path):
                try:
                    with open(self.file_path, 'r') as f:
                        existing = json.load(f)
                except Exception:
                    pass
            
            # Deep merge fields
            for k, v in data.items():
                existing[k] = v
                
            with open(self.file_path, 'w') as f:
                json.dump(existing, f, indent=2, default=str)
            return True
            
        def update(self, data):
            return self.set(data, merge=True)
            
        def delete(self):
            if os.path.exists(self.file_path):
                try:
                    os.remove(self.file_path)
                except Exception:
                    pass
            return True
            
    class MockQuery:
        def __init__(self, collection_path, filters=None, limit_val=None):
            self.collection_path = collection_path
            self.filters = filters or []
            self.limit_val = limit_val
            
        def where(self, field, op, value):
            new_filters = list(self.filters)
            new_filters.append((field, op, value))
            return MockQuery(self.collection_path, new_filters, self.limit_val)
            
        def limit(self, count):
            return MockQuery(self.collection_path, self.filters, count)
            
        def get(self):
            results = []
            prefix = f"{self.collection_path}_"
            if not os.path.exists(MOCK_DB_DIR):
                return results
                
            for fn in os.listdir(MOCK_DB_DIR):
                if fn.startswith(prefix) and fn.endswith('.json'):
                    doc_id = fn[len(prefix):-5]
                    file_path = os.path.join(MOCK_DB_DIR, fn)
                    try:
                        with open(file_path, 'r') as f:
                            data = json.load(f)
                        
                        match = True
                        for field, op, val in self.filters:
                            if field not in data:
                                match = False
                                break
                            
                            actual_val = data[field]
                            if op == '==':
                                if str(actual_val) != str(val):
                                    match = False
                                    break
                            elif op == 'in':
                                if actual_val not in val:
                                    match = False
                                    break
                        
                        if match:
                            results.append(MockDocumentSnapshot(doc_id, data))
                    except Exception:
                        pass
            
            # Apply limit if set
            if self.limit_val is not None:
                results = results[:self.limit_val]
            return results
            
        def stream(self):
            return self.get()
            
    class MockCollectionReference:
        def __init__(self, collection_path):
            self.collection_path = collection_path
            
        def document(self, doc_id=None):
            if not doc_id:
                doc_id = str(uuid.uuid4())
            return MockDocumentReference(self.collection_path, doc_id)
            
        def get(self):
            return MockQuery(self.collection_path).get()
            
        def limit(self, count):
            return MockQuery(self.collection_path).limit(count)
            
        def where(self, field, op, value):
            return MockQuery(self.collection_path).where(field, op, value)
            
        def stream(self):
            return MockQuery(self.collection_path).stream()
            
    class MockFirestoreClient:
        def collection(self, path):
            return MockCollectionReference(path)
            
    class MockBlob:
        def __init__(self, path):
            self.path = path
            safe_path = path.replace('/', '_').replace('\\', '_')
            self.file_path = os.path.join(MOCK_STORAGE_DIR, safe_path)
            # This points to a custom Flask route we will implement to serve local files
            self.public_url = f"/api/storage/file/{safe_path}"
            
        def upload_from_string(self, file_bytes, content_type='image/jpeg'):
            import base64
            # Handle base64 strings
            if isinstance(file_bytes, str):
                if ',' in file_bytes:
                    file_bytes = file_bytes.split(',')[1]
                data = base64.b64decode(file_bytes)
            else:
                data = file_bytes
                
            with open(self.file_path, 'wb') as f:
                f.write(data)
                
        def make_public(self):
            pass
            
    class MockBucket:
        def blob(self, path):
            return MockBlob(path)
            
    class MockStorageClient:
        def bucket(self):
            return MockBucket()
            
    db = MockFirestoreClient()
    bucket = MockStorageClient().bucket()
