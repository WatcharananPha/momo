import pytest
from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

def test_google_maps_api_key_endpoint():
    """
    Test 1: Backend Configuration Check
    Verify that the /line/config/maps endpoint returns a valid API key
    This ensures the frontend tracking.js can actually fetch it.
    """
    response = client.get("/api/v1/line/config/maps")
    assert response.status_code == 200
    
    data = response.json()
    assert "api_key" in data
    assert len(data["api_key"]) > 20, "API key should be a valid long string"
    assert data["api_key"].startswith("AIzaSy"), "Should look like a Google Maps API Key"
    print(f"\n✅ Backend Config Test Passed: MAP_API is securely served -> {data['api_key'][:10]}...")

def test_frontend_tracking_script_injection():
    """
    Test 2: Frontend DOM Manipulation Logic Check
    Verify that the tracking.js contains the correct DOM manipulation 
    logic to inject the Google Maps SDK dynamically.
    """
    with open("app/static/liff/js/tracking.js", "r") as f:
        script_content = f.read()

    # Verify that the script dynamically creates a script tag
    assert "document.createElement('script')" in script_content, "Missing createElement for SDK"
    assert "maps.googleapis.com/maps/api/js" in script_content, "Missing Google Maps URL"
    assert "document.head.appendChild(script)" in script_content, "Missing appendChild to inject SDK"
    
    # Verify that the script removes the 'hidden' class from map-container
    assert "classList.remove('hidden')" in script_content, "Missing logic to unhide map container"
    
    # Verify advanced Uber-like features exist in the code
    assert "google.maps.DirectionsService" in script_content, "Missing Routing Service"
    assert "smoothMoveMarker" in script_content, "Missing Smooth Animation Function"
    assert "requestAnimationFrame" in script_content, "Missing Animation Loop"
    
    print("\n✅ Frontend Logic Test Passed: Tracking script has correct DOM injection and Routing mechanisms.")

def test_html_structure_for_maps():
    """
    Test 3: HTML Container Integrity
    Verify that tracking.html has the correct placeholder elements 
    for the maps to bind to.
    """
    with open("app/static/liff/tracking.html", "r") as f:
        html_content = f.read()

    assert 'id="map-container"' in html_content, "Missing map-container wrapper"
    assert 'id="map"' in html_content, "Missing map binding target"
    assert 'hidden' in html_content, "Map container should be hidden initially"
    # Verify we removed the hardcoded script
    assert 'id="gmaps-script"' not in html_content, "Hardcoded map script placeholder should be removed"

    print("\n✅ HTML Structure Test Passed: DOM Containers are ready for SDK binding.")
