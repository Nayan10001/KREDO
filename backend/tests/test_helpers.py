import sys
from pathlib import Path

# Ensure the backend directory is in the python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.helpers import read_env_var


def test_read_env_var_exists(monkeypatch):
    monkeypatch.setenv("TEST_VAR_1", "  my_value  ")
    assert read_env_var("TEST_VAR_1") == "my_value"

def test_read_env_var_quotes(monkeypatch):
    monkeypatch.setenv("TEST_VAR_2", '"quoted_val"')
    assert read_env_var("TEST_VAR_2") == "quoted_val"
    
    monkeypatch.setenv("TEST_VAR_3", "'single_quoted'")
    assert read_env_var("TEST_VAR_3") == "single_quoted"

def test_read_env_var_missing():
    assert read_env_var("NON_EXISTENT_VAR_123") == ""

def test_read_env_var_multiple_candidates(monkeypatch):
    monkeypatch.setenv("TEST_VAR_SECOND", "second_val")
    # First is missing, should fall back to second
    assert read_env_var("TEST_VAR_FIRST", "TEST_VAR_SECOND") == "second_val"
