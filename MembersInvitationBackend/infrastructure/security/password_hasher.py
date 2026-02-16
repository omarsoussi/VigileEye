"""Hash/verify helper (bcrypt) used for invitation codes."""

import bcrypt


class PasswordHasher:
    ROUNDS = 12

    @staticmethod
    def hash(value: str) -> str:
        value_bytes = value.encode("utf-8")
        salt = bcrypt.gensalt(rounds=PasswordHasher.ROUNDS)
        hashed = bcrypt.hashpw(value_bytes, salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify(plain_value: str, hashed_value: str) -> bool:
        try:
            value_bytes = plain_value.encode("utf-8")
            hashed_bytes = hashed_value.encode("utf-8")
            return bcrypt.checkpw(value_bytes, hashed_bytes)
        except Exception:
            return False
