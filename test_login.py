import requests
import json

url = "http://localhost:5033/api/Account/login"
payload = {
    "email": "admin@school.com",
    "password": "Admin@123"
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, data=json.dumps(payload), headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
