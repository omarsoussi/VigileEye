"""
Unit tests for CreateZoneUseCase.
"""
import pytest
from unittest.mock import MagicMock
from uuid import uuid4

from application.use_cases.create_zone import CreateZoneUseCase
from domain.entities.camera import Camera, CameraStatus, CameraType
from domain.entities.zone import ZoneType, ZoneSeverity
from domain.exceptions import CameraNotFoundException


def _make_camera(owner_id):
    """Create a minimal Camera entity for testing."""
    return Camera(
        id=uuid4(),
        owner_user_id=owner_id,
        name="Test Cam",
        description=None,
        stream_url="rtsp://example.com/stream",
        protocol="RTSP",
        username=None,
        password=None,
        resolution="1080p",
        fps=30,
        encoding="H.264",
        camera_type=CameraType.INDOOR,
        status=CameraStatus.ONLINE,
        is_active=True,
    )


def _sample_points():
    return [
        {"x": 0.1, "y": 0.1},
        {"x": 0.9, "y": 0.1},
        {"x": 0.9, "y": 0.9},
        {"x": 0.1, "y": 0.9},
    ]


class TestCreateZoneUseCase:
    """Test the CreateZone business logic."""

    def _make_use_case(self, camera=None, save_zone=None, access=None):
        zone_repo = MagicMock()
        camera_repo = MagicMock()
        access_repo = MagicMock()

        if camera is not None:
            camera_repo.get_by_id.return_value = camera
        else:
            camera_repo.get_by_id.return_value = None

        if save_zone is None:
            # By default, zone_repo.create returns whatever is passed to it
            zone_repo.create.side_effect = lambda z: z
        else:
            zone_repo.create.return_value = save_zone

        if access is None:
            access_repo.get_access.return_value = None
        else:
            access_repo.get_access.return_value = access

        return CreateZoneUseCase(zone_repo=zone_repo, camera_repo=camera_repo, access_repo=access_repo), zone_repo, camera_repo

    def test_creates_zone_for_owned_camera(self):
        owner_id = uuid4()
        camera = _make_camera(owner_id)
        uc, zone_repo, _ = self._make_use_case(camera=camera)

        result = uc.execute(
            camera_id=camera.id,
            owner_user_id=owner_id,
            name="Entrance",
            zone_type=ZoneType.INTRUSION,
            points=_sample_points(),
        )

        assert result is not None
        assert result.name == "Entrance"
        assert result.zone_type == ZoneType.INTRUSION
        zone_repo.create.assert_called_once()

    def test_raises_when_camera_not_found(self):
        uc, _, _ = self._make_use_case(camera=None)

        with pytest.raises(CameraNotFoundException):
            uc.execute(
                camera_id=uuid4(),
                owner_user_id=uuid4(),
                name="Ghost",
                zone_type=ZoneType.MOTION,
                points=_sample_points(),
            )

    def test_raises_when_not_owner(self):
        owner_id = uuid4()
        other_user = uuid4()
        camera = _make_camera(owner_id)
        uc, _, _ = self._make_use_case(camera=camera)

        with pytest.raises(CameraNotFoundException):
            uc.execute(
                camera_id=camera.id,
                owner_user_id=other_user,
                name="Intruder Zone",
                zone_type=ZoneType.INTRUSION,
                points=_sample_points(),
            )

    def test_custom_severity_propagated(self):
        owner_id = uuid4()
        camera = _make_camera(owner_id)
        uc, _, _ = self._make_use_case(camera=camera)

        result = uc.execute(
            camera_id=camera.id,
            owner_user_id=owner_id,
            name="Critical Area",
            zone_type=ZoneType.RESTRICTED,
            points=_sample_points(),
            severity=ZoneSeverity.CRITICAL,
        )

        assert result.severity == ZoneSeverity.CRITICAL

    def test_custom_sensitivity(self):
        owner_id = uuid4()
        camera = _make_camera(owner_id)
        uc, _, _ = self._make_use_case(camera=camera)

        result = uc.execute(
            camera_id=camera.id,
            owner_user_id=owner_id,
            name="Sensitive",
            zone_type=ZoneType.MOTION,
            points=_sample_points(),
            sensitivity=80,
        )

        assert result.sensitivity == 80

    def test_points_converted_correctly(self):
        owner_id = uuid4()
        camera = _make_camera(owner_id)
        uc, _, _ = self._make_use_case(camera=camera)

        pts = [{"x": 0.25, "y": 0.5}, {"x": 0.75, "y": 0.5}, {"x": 0.5, "y": 0.9}]
        result = uc.execute(
            camera_id=camera.id,
            owner_user_id=owner_id,
            name="Triangle",
            zone_type=ZoneType.COUNTING,
            points=pts,
        )

        assert len(result.points) == 3
        assert result.points[0].x == 0.25
        assert result.points[0].y == 0.5

    def test_schedule_fields_passed(self):
        owner_id = uuid4()
        camera = _make_camera(owner_id)
        uc, _, _ = self._make_use_case(camera=camera)

        result = uc.execute(
            camera_id=camera.id,
            owner_user_id=owner_id,
            name="Scheduled",
            zone_type=ZoneType.LOITERING,
            points=_sample_points(),
            schedule_enabled=True,
            schedule_start="09:00",
            schedule_end="17:00",
            schedule_days="mon,tue,wed",
        )

        assert result.schedule_enabled is True
        assert result.schedule_start == "09:00"
        assert result.schedule_days == "mon,tue,wed"
