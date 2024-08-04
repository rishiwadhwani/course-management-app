import os
import pandas as pd
import requests
import io
import datetime
from flask import Flask, jsonify, request
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId, InvalidId
from flask_cors import CORS
import certifi

# Configure SSL certificates
os.environ['SSL_CERT_FILE'] = certifi.where()

app = Flask(__name__)
CORS(app)  # Allow CORS for local development

# MongoDB connection setup
uri = "mongodb+srv://courseManagementAdmin:ywDrw28Z2G5xrfdJ@coursemanagementcluster.gnovrr6.mongodb.net/?retryWrites=true&w=majority&appName=CourseManagementCluster0"
client = MongoClient(uri, server_api=ServerApi('1'))
db = client['course_management']
collection = db['courses']

# Utility functions
def fetch_and_save_data():
    url = 'https://api.mockaroo.com/api/501b2790?count=100&key=8683a1c0'
    response = requests.get(url)
    
    if response.status_code == 200:
        # Use io.StringIO instead of pandas.compat.StringIO
        df = pd.read_csv(io.StringIO(response.text))
        
        # No renaming of columns needed; use updated column names directly
        df['StartDate'] = pd.to_datetime(df['StartDate'], errors='coerce')
        df['EndDate'] = pd.to_datetime(df['EndDate'], errors='coerce')
        
        # Normalize and save data to MongoDB
        collection.drop()  # Drop existing collection data
        data = df.to_dict(orient='records')
        collection.insert_many(data)
        
        # Update refresh timestamp
        refresh_data = {
            '_id': 'refresh',
            'last_refresh': datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc)
        }
        collection.replace_one({'_id': 'refresh'}, refresh_data, upsert=True)
        
    else:
        app.logger.error(f"Failed to fetch data from URL: {response.status_code}")



def check_data_expiry():
    try:
        # Fetch the last refresh timestamp
        refresh_entry = collection.find_one({'_id': 'refresh'})
        if refresh_entry:
            last_refresh = refresh_entry.get('last_refresh')
            if last_refresh:
                # Ensure last_refresh is timezone-aware
                if last_refresh.tzinfo is None:
                    last_refresh = last_refresh.replace(tzinfo=datetime.timezone.utc)
                
                current_time = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc)
                if (current_time - last_refresh).total_seconds() > 600:  # 10 minutes
                    app.logger.info("Data expired, fetching new data.")
                    fetch_and_save_data()
                else:
                    app.logger.info("Data is fresh.")
        else:
            app.logger.info("No refresh record found, fetching new data.")
            fetch_and_save_data()
    except Exception as e:
        app.logger.error(f"Error checking data expiry: {e}")
        raise


@app.route('/courses', methods=['GET'])
def get_courses():
    try:
        check_data_expiry()  # Ensure data is fresh

        filter_text = request.args.get('filter', '')
        page = int(request.args.get('page', 1))
        size = int(request.args.get('size', 10))

        # Validate and sanitize page and size
        if page < 1:
            page = 1
        if size < 1:
            size = 10

        query = {
            "$or": [
                {"CourseName": {"$regex": filter_text, "$options": "i"}},
                {"University": {"$regex": filter_text, "$options": "i"}},
                {"City": {"$regex": filter_text, "$options": "i"}},
                {"Country": {"$regex": filter_text, "$options": "i"}},
                {"CourseDescription": {"$regex": filter_text, "$options": "i"}}
            ]
        }

        skip = (page - 1) * size
        courses_cursor = collection.find(query).skip(skip).limit(size)
        total_count = collection.count_documents(query)
        data = []

        for course in courses_cursor:
            course['_id'] = str(course['_id'])
            course['StartDate'] = course['StartDate'].strftime('%Y-%m-%d') if isinstance(course.get('StartDate'), datetime.datetime) else ''
            course['EndDate'] = course['EndDate'].strftime('%Y-%m-%d') if isinstance(course.get('EndDate'), datetime.datetime) else ''
            course['Price'] = f"{course.get('Price', 0.0):.2f}"
            data.append(course)

        return jsonify({'total': total_count, 'data': data})

    except Exception as e:
        app.logger.error(f"Error fetching courses: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500


@app.route('/courses/<course_id>', methods=['GET'])
def get_course(course_id):
    try:
        check_data_expiry()  # Ensure data is fresh

        course_id = ObjectId(course_id)
    except (InvalidId, ValueError):
        return jsonify({'error': 'Invalid course ID format'}), 400

    try:
        course = collection.find_one({"_id": course_id})
        if course:
            course['_id'] = str(course['_id'])
            course['StartDate'] = course['StartDate'].strftime('%Y-%m-%d') if course['StartDate'] else ''
            course['EndDate'] = course['EndDate'].strftime('%Y-%m-%d') if course['EndDate'] else ''
            course['Price'] = f"{course.get('Price', 0.0):.2f}"
            return jsonify(course)
        return jsonify({'error': 'Course not found'}), 404
    except Exception as e:
        app.logger.error(f"Error fetching course by ID: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500

@app.route('/courses', methods=['POST'])
def create_course():
    try:
        check_data_expiry()  # Ensure data is fresh

        course = request.json
        course['StartDate'] = pd.to_datetime(course['StartDate'])
        course['EndDate'] = pd.to_datetime(course['EndDate'])
        result = collection.insert_one(course)
        return jsonify({'_id': str(result.inserted_id)}), 201
    except Exception as e:
        app.logger.error(f"Error creating course: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500

@app.route('/courses/<course_id>', methods=['PUT'])
def update_course(course_id):
    try:
        check_data_expiry()  # Ensure data is fresh

        course_id = ObjectId(course_id)
    except (InvalidId, ValueError):
        return jsonify({'error': 'Invalid course ID format'}), 400

    try:
        course = request.json
        course['StartDate'] = pd.to_datetime(course['StartDate'])
        course['EndDate'] = pd.to_datetime(course['EndDate'])
        collection.update_one({"_id": course_id}, {"$set": course})
        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error updating course: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500

@app.route('/courses/<course_id>', methods=['DELETE'])
def delete_course(course_id):
    try:
        check_data_expiry()  # Ensure data is fresh

        course_id = ObjectId(course_id)
    except (InvalidId, ValueError):
        return jsonify({'error': 'Invalid course ID format'}), 400

    try:
        collection.delete_one({"_id": course_id})
        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error deleting course: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500

@app.route('/autocomplete/countries', methods=['GET'])
def get_countries():
    countries = collection.distinct('Country')
    return jsonify(countries)

@app.route('/autocomplete/cities', methods=['GET'])
def get_cities():
    cities = collection.distinct('City')
    return jsonify(cities)

@app.route('/autocomplete/universities', methods=['GET'])
def get_universities():
    universities = collection.distinct('University')
    return jsonify(universities)

@app.route('/autocomplete/currencies', methods=['GET'])
def get_currencies():
    currencies = collection.distinct('Currency')
    return jsonify(currencies)

if __name__ == '__main__':
    app.run(debug=True)
