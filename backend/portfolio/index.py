'''
Business: Portfolio works management - get, create, update works and manage favorites
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with portfolio data
'''

import json
import os
from typing import Dict, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_work(work):
    if not work:
        return None
    result = dict(work)
    if 'created_at' in result and isinstance(result['created_at'], datetime):
        result['created_at'] = result['created_at'].isoformat()
    return result

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            user_id = params.get('user_id')
            action = params.get('action', 'all')
            
            if action == 'favorites' and user_id:
                cursor.execute("""
                    SELECT p.*, 
                           CASE WHEN f.id IS NOT NULL THEN true ELSE false END as is_favorite
                    FROM portfolio_works p
                    INNER JOIN favorites f ON p.id = f.work_id
                    WHERE f.user_id = %s
                    ORDER BY p.created_at DESC
                """, (user_id,))
            else:
                if user_id:
                    cursor.execute("""
                        SELECT p.*, 
                               CASE WHEN f.id IS NOT NULL THEN true ELSE false END as is_favorite
                        FROM portfolio_works p
                        LEFT JOIN favorites f ON p.id = f.work_id AND f.user_id = %s
                        ORDER BY p.created_at DESC
                    """, (user_id,))
                else:
                    cursor.execute("SELECT * FROM portfolio_works ORDER BY created_at DESC")
            
            works = cursor.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'works': [serialize_work(w) for w in works]})
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'add_work':
                user_id = body_data.get('user_id')
                title = body_data.get('title', 'Untitled')
                description = body_data.get('description', '')
                image_url = body_data.get('image_url')
                
                if not image_url:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps({'error': 'Image URL required'})
                    }
                
                cursor.execute(
                    "INSERT INTO portfolio_works (user_id, title, description, image_url) VALUES (%s, %s, %s, %s) RETURNING *",
                    (user_id, title, description, image_url)
                )
                work = cursor.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'work': serialize_work(work)})
                }
            
            elif action == 'toggle_favorite':
                user_id = body_data.get('user_id')
                work_id = body_data.get('work_id')
                
                cursor.execute("SELECT id FROM favorites WHERE user_id = %s AND work_id = %s", (user_id, work_id))
                existing = cursor.fetchone()
                
                if existing:
                    cursor.execute("DELETE FROM favorites WHERE user_id = %s AND work_id = %s", (user_id, work_id))
                    is_favorite = False
                else:
                    cursor.execute("INSERT INTO favorites (user_id, work_id) VALUES (%s, %s)", (user_id, work_id))
                    is_favorite = True
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'is_favorite': is_favorite})
                }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {}) or {}
            work_id = params.get('work_id')
            
            if not work_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Work ID required'})
                }
            
            cursor.execute("DELETE FROM favorites WHERE work_id = %s", (work_id,))
            cursor.execute("DELETE FROM portfolio_works WHERE id = %s", (work_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'success': True})
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    finally:
        cursor.close()
        conn.close()