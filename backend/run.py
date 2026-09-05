import sys
import os
import uvicorn

# Ensure backend folder is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

if __name__ == "__main__":
    print("Starting DealFlow360 Backend Server...")
    print("Interactive Swagger API Docs: http://localhost:8008/docs")
    print("API Base URL: http://localhost:8008/api/v1")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8008, reload=True)
