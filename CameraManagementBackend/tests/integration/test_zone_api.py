"""
Integration tests for Camera Management zone API endpoints.
Uses SQLite in-memory DB + mocked auth (see conftest.py).
"""
import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Tests for health check endpoint (no auth required)."""

    def test_health_returns_200(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "camera-management"


class TestCreateZone:
    """Tests for POST /api/v1/zones."""

    def test_create_zone_success(self, client: TestClient, seed_camera):
        payload = {
            "camera_id": str(seed_camera),
            "name": "entrance-zone",
            "zone_type": "intrusion",
            "points": [
                {"x": 0.1, "y": 0.1},
                {"x": 0.9, "y": 0.1},
                {"x": 0.9, "y": 0.9},
            ],
        }
        response = client.post("/api/v1/zones", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "entrance-zone"
        assert data["zone_type"] == "intrusion"
        assert data["is_active"] is True
        assert len(data["points"]) == 3
        assert data["camera_id"] == str(seed_camera)

    def test_create_zone_custom_severity(self, client: TestClient, seed_camera):
        payload = {
            "camera_id": str(seed_camera),
            "name": "high-risk",
            "zone_type": "intrusion",
            "severity": "high",
            "points": [
                {"x": 0.0, "y": 0.0},
                {"x": 1.0, "y": 0.0},
                {"x": 1.0, "y": 1.0},
            ],
        }
        response = client.post("/api/v1/zones", json=payload)
        assert response.status_code == 201
        assert response.json()["severity"] == "high"

    def test_create_zone_camera_not_found(self, client: TestClient):
        payload = {
            "camera_id": "00000000-0000-0000-0000-000000000000",
            "name": "ghost-zone",
            "points": [
                {"x": 0.1, "y": 0.1},
                {"x": 0.5, "y": 0.1},
                {"x": 0.5, "y": 0.5},
            ],
        }
        response = client.post("/api/v1/zones", json=payload)
        assert response.status_code == 404

    def test_create_zone_too_few_points(self, client: TestClient, seed_camera):
        payload = {
            "camera_id": str(seed_camera),
            "name": "bad-zone",
            "points": [{"x": 0.1, "y": 0.1}, {"x": 0.5, "y": 0.5}],
        }
        response = client.post("/api/v1/zones", json=payload)
        assert response.status_code == 422  # validation error

    def test_create_zone_invalid_point_range(self, client: TestClient, seed_camera):
        payload = {
            "camera_id": str(seed_camera),
            "name": "oob-zone",
            "points": [
                {"x": -0.5, "y": 0.0},
                {"x": 1.5, "y": 0.0},
                {"x": 1.0, "y": 1.0},
            ],
        }
        response = client.post("/api/v1/zones", json=payload)
        assert response.status_code == 422


class TestListZones:
    """Tests for GET /api/v1/zones and GET /api/v1/zones/camera/{id}."""

    def _create_zone(self, client: TestClient, camera_id, name="z"):
        return client.post(
            "/api/v1/zones",
            json={
                "camera_id": str(camera_id),
                "name": name,
                "points": [
                    {"x": 0.1, "y": 0.1},
                    {"x": 0.9, "y": 0.1},
                    {"x": 0.9, "y": 0.9},
                ],
            },
        )

    def test_list_my_zones_empty(self, client: TestClient):
        response = client.get("/api/v1/zones")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_my_zones_with_data(self, client: TestClient, seed_camera):
        self._create_zone(client, seed_camera, "z1")
        self._create_zone(client, seed_camera, "z2")
        response = client.get("/api/v1/zones")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_list_camera_zones(self, client: TestClient, seed_camera):
        self._create_zone(client, seed_camera, "cam-z")
        response = client.get(f"/api/v1/zones/camera/{seed_camera}")
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["name"] == "cam-z"


class TestGetUpdateDeleteZone:
    """Tests for single-zone endpoints."""

    def _create_zone(self, client: TestClient, camera_id, name="test-zone"):
        resp = client.post(
            "/api/v1/zones",
            json={
                "camera_id": str(camera_id),
                "name": name,
                "points": [
                    {"x": 0.1, "y": 0.1},
                    {"x": 0.9, "y": 0.1},
                    {"x": 0.9, "y": 0.9},
                ],
            },
        )
        return resp.json()

    def test_get_zone(self, client: TestClient, seed_camera):
        zone = self._create_zone(client, seed_camera)
        response = client.get(f"/api/v1/zones/{zone['id']}")
        assert response.status_code == 200
        assert response.json()["id"] == zone["id"]

    def test_get_zone_not_found(self, client: TestClient):
        response = client.get("/api/v1/zones/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404

    def test_update_zone_name(self, client: TestClient, seed_camera):
        zone = self._create_zone(client, seed_camera)
        response = client.put(
            f"/api/v1/zones/{zone['id']}",
            json={"name": "renamed-zone"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "renamed-zone"

    def test_deactivate_and_activate_zone(self, client: TestClient, seed_camera):
        zone = self._create_zone(client, seed_camera)
        zone_id = zone["id"]

        # Deactivate
        resp = client.post(f"/api/v1/zones/{zone_id}/deactivate")
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

        # Activate
        resp = client.post(f"/api/v1/zones/{zone_id}/activate")
        assert resp.status_code == 200
        assert resp.json()["is_active"] is True

    def test_delete_zone(self, client: TestClient, seed_camera):
        zone = self._create_zone(client, seed_camera)
        zone_id = zone["id"]

        resp = client.delete(f"/api/v1/zones/{zone_id}")
        assert resp.status_code == 200
        assert "deleted" in resp.json()["message"].lower()

        # Verify gone
        resp = client.get(f"/api/v1/zones/{zone_id}")
        assert resp.status_code == 404


class TestZoneStats:
    """Tests for GET /api/v1/zones/stats."""

    def test_stats_empty(self, client: TestClient):
        response = client.get("/api/v1/zones/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_zones"] == 0
        assert data["active_zones"] == 0

    def test_stats_with_zones(self, client: TestClient, seed_camera):
        for i in range(3):
            client.post(
                "/api/v1/zones",
                json={
                    "camera_id": str(seed_camera),
                    "name": f"zone-{i}",
                    "points": [
                        {"x": 0.1, "y": 0.1},
                        {"x": 0.9, "y": 0.1},
                        {"x": 0.9, "y": 0.9},
                    ],
                },
            )
        response = client.get("/api/v1/zones/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_zones"] == 3
        assert data["active_zones"] == 3
        assert data["cameras_with_zones"] == 1
