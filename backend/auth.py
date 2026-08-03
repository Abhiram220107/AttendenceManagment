import os
import datetime
from functools import wraps
from flask import request, jsonify
import jwt
from werkzeug.security import generate_password_hash, check_password_hash

SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'ieee_event_attendance_management_secret_key_2026'

def hash_password(password):
    return generate_password_hash(password)

def check_password(hashed_password, password):
    return check_password_hash(hashed_password, password)

def generate_token(user_id, role, email=None, registration_number=None):
    payload = {
        'userId': user_id,
        'role': role,
        'email': email,
        'registrationNumber': registration_number,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def token_required(allowed_roles=None):
    # This allows using the decorator as @token_required (without arguments)
    # or as @token_required(allowed_roles=['admin'])
    if callable(allowed_roles):
        func = allowed_roles
        @wraps(func)
        def decorated(*args, **kwargs):
            token = None
            if 'Authorization' in request.headers:
                auth_header = request.headers['Authorization']
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
            
            if not token:
                return jsonify({'message': 'Token is missing!'}), 401
            
            try:
                data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
                current_user = {
                    'userId': data['userId'],
                    'role': data['role'],
                    'email': data.get('email'),
                    'registrationNumber': data.get('registrationNumber')
                }
            except jwt.ExpiredSignatureError:
                return jsonify({'message': 'Token has expired!'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'message': 'Token is invalid!'}), 401
                
            return func(current_user, *args, **kwargs)
        return decorated
        
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = None
            if 'Authorization' in request.headers:
                auth_header = request.headers['Authorization']
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
            
            if not token:
                return jsonify({'message': 'Token is missing!'}), 401
            
            try:
                data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
                current_user = {
                    'userId': data['userId'],
                    'role': data['role'],
                    'email': data.get('email'),
                    'registrationNumber': data.get('registrationNumber')
                }
                
                if allowed_roles and current_user['role'] not in allowed_roles:
                    return jsonify({'message': 'Access forbidden: unauthorized role!'}), 403
                    
            except jwt.ExpiredSignatureError:
                return jsonify({'message': 'Token has expired!'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'message': 'Token is invalid!'}), 401
                
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator
