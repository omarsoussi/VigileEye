"""
Unit tests for Zone domain entity.
"""
import pytest
from uuid import uuid4
from domain.entities.zone import Zone, ZoneType, ZoneSeverity, ZonePoint


class TestZoneCreation:
    """Test Zone.create factory method."""

    def _sample_points(self):
        return [
            {"x": 0.1, "y": 0.1},
            {"x": 0.9, "y": 0.1},
            {"x": 0.9, "y": 0.9},
            {"x": 0.1, "y": 0.9},
        ]

    def test_create_returns_zone(self):
        zone = Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Test Zone",
            zone_type=ZoneType.INTRUSION,
            points=self._sample_points(),
        )
        assert isinstance(zone, Zone)
        assert zone.name == "Test Zone"

    def test_create_sets_active_by_default(self):
        zone = Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Active Zone",
            zone_type=ZoneType.MOTION,
            points=self._sample_points(),
        )
        assert zone.is_active is True

    def test_create_converts_dict_points_to_zone_points(self):
        zone = Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Point Zone",
            zone_type=ZoneType.INTRUSION,
            points=self._sample_points(),
        )
        assert len(zone.points) == 4
        assert all(isinstance(p, ZonePoint) for p in zone.points)
        assert zone.points[0].x == 0.1
        assert zone.points[0].y == 0.1

    def test_create_default_severity_medium(self):
        zone = Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Default Sev",
            zone_type=ZoneType.INTRUSION,
            points=self._sample_points(),
        )
        assert zone.severity == ZoneSeverity.MEDIUM

    def test_create_custom_severity(self):
        zone = Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Critical Zone",
            zone_type=ZoneType.RESTRICTED,
            points=self._sample_points(),
            severity=ZoneSeverity.CRITICAL,
        )
        assert zone.severity == ZoneSeverity.CRITICAL

    def test_create_default_color(self):
        zone = Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Color",
            zone_type=ZoneType.INTRUSION,
            points=self._sample_points(),
        )
        assert zone.color == "#ef4444"

    def test_create_custom_color(self):
        zone = Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Blue",
            zone_type=ZoneType.MOTION,
            points=self._sample_points(),
            color="#3b82f6",
        )
        assert zone.color == "#3b82f6"

    def test_create_default_sensitivity(self):
        zone = Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Sens",
            zone_type=ZoneType.INTRUSION,
            points=self._sample_points(),
        )
        assert zone.sensitivity == 50

    def test_create_custom_schedule(self):
        zone = Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Scheduled",
            zone_type=ZoneType.LOITERING,
            points=self._sample_points(),
            schedule_enabled=True,
            schedule_start="08:00",
            schedule_end="18:00",
            schedule_days="mon,tue,wed,thu,fri",
        )
        assert zone.schedule_enabled is True
        assert zone.schedule_start == "08:00"
        assert zone.schedule_days == "mon,tue,wed,thu,fri"

    def test_create_generates_unique_id(self):
        zone1 = Zone.create(camera_id=uuid4(), owner_user_id=uuid4(), name="A", zone_type=ZoneType.INTRUSION, points=self._sample_points())
        zone2 = Zone.create(camera_id=uuid4(), owner_user_id=uuid4(), name="B", zone_type=ZoneType.INTRUSION, points=self._sample_points())
        assert zone1.id != zone2.id


class TestZoneUpdate:
    """Test Zone.update method."""

    def _make_zone(self):
        return Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Original",
            zone_type=ZoneType.INTRUSION,
            points=[{"x": 0.0, "y": 0.0}, {"x": 1.0, "y": 0.0}, {"x": 0.5, "y": 1.0}],
        )

    def test_update_name(self):
        zone = self._make_zone()
        zone.update(name="Renamed")
        assert zone.name == "Renamed"

    def test_update_sensitivity(self):
        zone = self._make_zone()
        zone.update(sensitivity=80)
        assert zone.sensitivity == 80

    def test_update_points(self):
        zone = self._make_zone()
        new_points = [{"x": 0.2, "y": 0.2}, {"x": 0.8, "y": 0.2}, {"x": 0.5, "y": 0.8}]
        zone.update(points=new_points)
        assert len(zone.points) == 3
        assert zone.points[0].x == 0.2

    def test_update_ignores_none(self):
        zone = self._make_zone()
        original_name = zone.name
        zone.update(name=None)
        assert zone.name == original_name

    def test_update_changes_updated_at(self):
        zone = self._make_zone()
        original_ts = zone.updated_at
        zone.update(name="New Name")
        assert zone.updated_at >= original_ts


class TestZoneActivation:
    """Test zone activation / deactivation."""

    def _make_zone(self):
        return Zone.create(
            camera_id=uuid4(),
            owner_user_id=uuid4(),
            name="Toggle",
            zone_type=ZoneType.MOTION,
            points=[{"x": 0.0, "y": 0.0}, {"x": 1.0, "y": 0.0}, {"x": 0.5, "y": 1.0}],
        )

    def test_deactivate(self):
        zone = self._make_zone()
        assert zone.is_active is True
        zone.deactivate()
        assert zone.is_active is False

    def test_activate(self):
        zone = self._make_zone()
        zone.deactivate()
        zone.activate()
        assert zone.is_active is True


class TestZoneTypes:
    """Verify zone type and severity enums."""

    def test_all_zone_types(self):
        expected = {"intrusion", "motion", "loitering", "line_cross", "crowd", "restricted", "counting"}
        actual = {zt.value for zt in ZoneType}
        assert actual == expected

    def test_all_severities(self):
        expected = {"low", "medium", "high", "critical"}
        actual = {s.value for s in ZoneSeverity}
        assert actual == expected
