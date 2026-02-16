"""One-time code generator for invitation approval."""

import secrets
import string


class OTPGenerator:
    DEFAULT_LENGTH = 6

    @classmethod
    def generate(cls, length: int = DEFAULT_LENGTH) -> str:
        return "".join(secrets.choice(string.digits) for _ in range(length))
