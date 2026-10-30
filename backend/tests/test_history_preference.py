from detector import accounts
from detector.config import Settings


def _settings(tmp_path):
    return Settings(
        _env_file=None,
        database_url=f"sqlite:///{tmp_path / 'accounts.sqlite3'}",
        byok_encryption_key="MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    )


def _user():
    return {
        "sub": "a" * 64,
        "email": "reader@example.test",
        "name": "Reader",
        "picture": "",
        "auth_iat": 1_798_000_000_000,
    }


def _result(entry_id):
    return {
        "id": entry_id,
        "modality": "news",
        "verdict": "LIKELY_REAL",
        "summary": "A short summary",
        "confidence": 0.82,
        "created_at": "2026-10-30T10:00:00+00:00",
    }


def test_history_is_off_by_default_and_saves_only_after_opt_in(tmp_path):
    settings = _settings(tmp_path)
    user = _user()

    assert accounts.account_status(user, settings)["history_enabled"] is False
    accounts.save_detection(user, _result("first"), "A story", settings)
    assert accounts.get_history(user["sub"], settings) == []

    assert accounts.set_history_enabled(user, True, settings) == 0
    accounts.save_detection(user, _result("second"), "Another story", settings)
    history = accounts.get_history(user["sub"], settings)
    assert [entry["id"] for entry in history] == ["second"]


def test_turning_history_off_deletes_saved_results(tmp_path):
    settings = _settings(tmp_path)
    user = _user()
    accounts.set_history_enabled(user, True, settings)
    accounts.save_detection(user, _result("saved"), "A saved story", settings)

    assert accounts.set_history_enabled(user, False, settings) == 1
    assert accounts.get_history(user["sub"], settings) == []
    assert accounts.account_status(user, settings)["history_enabled"] is False

    accounts.set_history_enabled(user, True, settings)
    assert accounts.get_history(user["sub"], settings) == []


def test_history_preference_api_route_updates_the_account(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from detector import main
    from detector.auth import require_user

    settings = _settings(tmp_path)
    previous_overrides = main.app.dependency_overrides.copy()
    monkeypatch.setattr(main, "settings", settings)
    main.app.dependency_overrides[require_user] = _user
    try:
        with TestClient(main.app) as client:
            account = client.get("/account")
            assert account.status_code == 200
            assert account.json()["history_enabled"] is False

            enabled = client.patch("/account/preferences/history", json={"enabled": True})
            assert enabled.status_code == 200
            assert enabled.json()["history_enabled"] is True

            disabled = client.patch("/account/preferences/history", json={"enabled": False})
            assert disabled.status_code == 200
            assert disabled.json()["history_enabled"] is False
    finally:
        main.app.dependency_overrides.clear()
        main.app.dependency_overrides.update(previous_overrides)
