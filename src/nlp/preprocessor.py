"""Vietnamese text preprocessing module for BudgetBot NLP pipeline.

Implements KAN-14 / FR-09:
- Chuẩn hóa Unicode tiếng Việt dựng sẵn (NFC).
- Chuyển chữ thường (lowercase).
- Xóa bỏ ký tự đặc biệt, số tài khoản, mã giao dịch rác (FT..., TRX...).
- Tách từ tiếng Việt (tokenization) sử dụng thư viện pyvi.
"""
import html
import re
import unicodedata
from typing import Any, Iterable, List, Optional, Union

try:
    from pyvi import ViTokenizer
    HAS_PYVI = True
except ImportError:
    HAS_PYVI = False

# Tone normalization map: Old style -> New style (Chuẩn hóa vị trí đặt dấu tiếng Việt)
# E.g.: hoà -> hòa, thuỷ -> thủy, toà -> tòa
_TONE_NORMALIZATION_MAP = {
    "òa": "oà", "óa": "oá", "ỏa": "oả", "õa": "oã", "ọa": "oạ",
    "òe": "oè", "óe": "oé", "ỏe": "oẻ", "õe": "oẽ", "ọe": "oẹ",
    "ùy": "uỳ", "úy": "uý", "ủy": "uỷ", "ũy": "uỹ", "ụy": "uỵ",
}
# Inverse to standardize on modern style (dấu đặt trên âm chính)
_MODERN_TONE_MAP = {
    "oà": "hòa".replace("h", ""), "oá": "hóa".replace("h", ""),
    "oả": "hỏa".replace("h", ""), "oã": "hoã".replace("h", ""),
    "oạ": "họa".replace("h", ""), "uỳ": "thùy".replace("th", ""),
    "uý": "thúy".replace("th", ""), "uỷ": "thủy".replace("th", ""),
    "uỹ": "thuỹ".replace("th", ""), "uỵ": "thụy".replace("th", ""),
}

# Regex patterns for bank transaction noise
_RE_TRANSACTION_CODES = re.compile(
    r"\b(?:ft|trx|pos|bds|ref|trace|napas)[a-z0-9_-]{4,}\b",
    re.IGNORECASE
)
_RE_BANK_TRACE_PREFIXES = re.compile(
    r"\b(?:mbvcb|vcb|tcb|bidv|mbbank|vietinbank|acb|vpbank|zalopay|momo)\.[a-z0-9_.-]+\b",
    re.IGNORECASE
)
_RE_LONG_CODES = re.compile(
    r"\bgd\s*[a-z0-9_-]{6,}\b",
    re.IGNORECASE
)
_RE_STK_ACCOUNTS = re.compile(
    r"\b(?:stk|so\s*tk|so\s*tai\s*khoan|tai\s*khoan|tk)\s*[:#.-]?\s*\d+\b",
    re.IGNORECASE
)
_RE_CARD_OR_ACCOUNT_DIGITS = re.compile(r"\b\d{7,19}\b")
_RE_PHONE_NUMBERS = re.compile(r"\b0[35789]\d{8}\b")
_RE_DATES = re.compile(r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b")
_RE_TIMES = re.compile(r"\b\d{1,2}:\d{2}(?::\d{2})?\b")
_RE_URLS_EMAILS = re.compile(r"(?:https?://\S+|www\.\S+|\S+@\S+\.\S+)")
_RE_SPECIAL_CHARS = re.compile(r"[^\w\s]", re.UNICODE)
_RE_DIGITS = re.compile(r"\b\d+\b")
_RE_MULTIPLE_SPACES = re.compile(r"\s+")


def normalize_unicode(text: str) -> str:
    """Normalize text to Unicode NFC (composed form).

    Converts decomposed Unicode (NFD) common in Vietnamese input methods
    (e.g. Unikey / TELEX) to composed Unicode (NFC).
    """
    if not text:
        return ""
    text = unicodedata.normalize("NFC", str(text))
    return text


def normalize_tones(text: str) -> str:
    """Standardize Vietnamese tone mark placement to modern rules."""
    if not text:
        return ""
    # Ensure NFC first
    text = unicodedata.normalize("NFC", text)
    for old_tone, new_tone in _MODERN_TONE_MAP.items():
        text = text.replace(old_tone, new_tone)
    return text


def remove_transaction_codes(text: str) -> str:
    """Remove opaque bank transaction codes (FT..., TRX..., POS..., BDS..., REF...)."""
    if not text:
        return ""
    text = _RE_TRANSACTION_CODES.sub(" ", text)
    text = _RE_BANK_TRACE_PREFIXES.sub(" ", text)
    text = _RE_LONG_CODES.sub(" ", text)
    return text


def remove_account_numbers(text: str) -> str:
    """Remove bank account numbers, card digits, phone numbers, and timestamps."""
    if not text:
        return ""
    text = _RE_STK_ACCOUNTS.sub(" ", text)
    text = _RE_CARD_OR_ACCOUNT_DIGITS.sub(" ", text)
    text = _RE_PHONE_NUMBERS.sub(" ", text)
    text = _RE_DATES.sub(" ", text)
    text = _RE_TIMES.sub(" ", text)
    text = _RE_URLS_EMAILS.sub(" ", text)
    return text


def remove_special_characters(text: str, keep_compound_underscore: bool = False) -> str:
    """Remove punctuation and special characters, keeping alphanumeric and Vietnamese letters."""
    if not text:
        return ""
    if keep_compound_underscore:
        # Keep underscores if text was already tokenized with pyvi (e.g. tien_dien)
        text = re.sub(r"[^\w\s_]", " ", text, flags=re.UNICODE)
    else:
        text = _RE_SPECIAL_CHARS.sub(" ", text)
    return text


def remove_vietnamese_accents(text: str) -> str:
    """Remove Vietnamese diacritics / tone marks, converting e.g. 'ăn trưa' -> 'an trua'."""
    if not text:
        return ""
    text = str(text).replace("đ", "d").replace("Đ", "D")
    nfd = unicodedata.normalize("NFD", text)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def remove_standalone_numbers(text: str) -> str:
    """Remove isolated digits/numbers that carry no semantic category value."""
    if not text:
        return ""
    return _RE_DIGITS.sub(" ", text)


def tokenize_vietnamese(text: str) -> str:
    """Tokenize Vietnamese compound words using pyvi.ViTokenizer.

    Joins multi-word tokens with an underscore (e.g., 'tiền điện' -> 'tiền_điện',
    'Highlands Coffee' -> 'Highlands_Coffee').
    Falls back gracefully to plain text if pyvi is unavailable or errors.
    """
    if not text or not text.strip():
        return ""
    if HAS_PYVI:
        try:
            return ViTokenizer.tokenize(text.strip())
        except Exception:
            return text.strip()
    return text.strip()


def preprocess(
    text: Any,
    lowercase: bool = True,
    remove_codes: bool = True,
    remove_accounts: bool = True,
    remove_specials: bool = True,
    remove_numbers: bool = True,
    tokenize: bool = True,
) -> str:
    """Complete preprocessing pipeline for Vietnamese bank transaction text.

    Pipeline Steps:
        1. Convert to string & unescape HTML entities.
        2. Normalize Unicode to NFC (composed form).
        3. Convert to lowercase (if lowercase=True).
        4. Strip opaque transaction codes (FT..., TRX..., POS...).
        5. Strip account numbers, phone numbers, dates, times.
        6. Strip special characters and punctuation.
        7. Strip standalone digits (if remove_numbers=True).
        8. Collapse multiple whitespace and strip.
        9. Vietnamese compound word tokenization via pyvi (if tokenize=True).
        10. Final whitespace normalization.

    Args:
        text: Raw transaction description.
        lowercase: Whether to convert text to lowercase (default: True).
        remove_codes: Whether to remove transaction codes (default: True).
        remove_accounts: Whether to remove account numbers (default: True).
        remove_specials: Whether to remove special characters (default: True).
        remove_numbers: Whether to remove isolated numbers (default: True).
        tokenize: Whether to apply pyvi compound word tokenization (default: True).

    Returns:
        Cleaned, normalized, and tokenized string.
    """
    if text is None:
        return ""

    s = str(text).strip()
    if not s:
        return ""

    # 1. Unescape HTML
    s = html.unescape(s)

    # 2. Unicode NFC Normalization
    s = normalize_unicode(s)

    # 3. Lowercase
    if lowercase:
        s = s.lower()

    # 4. Remove Transaction Codes
    if remove_codes:
        s = remove_transaction_codes(s)

    # 5. Remove Account / Phone Numbers & Dates
    if remove_accounts:
        s = remove_account_numbers(s)

    # 6. Remove Special Characters
    if remove_specials:
        s = remove_special_characters(s)

    # 7. Remove Standalone Numbers
    if remove_numbers:
        s = remove_standalone_numbers(s)

    # 8. Collapse spaces before tokenization
    s = _RE_MULTIPLE_SPACES.sub(" ", s).strip()

    # 9. Tokenization (pyvi)
    if tokenize and s:
        s = tokenize_vietnamese(s)

    # 10. Final whitespace cleanup
    s = _RE_MULTIPLE_SPACES.sub(" ", s).strip()
    return s


def clean_bank_description(text: Any) -> str:
    """Convenience alias for standard banking text preprocessing."""
    return preprocess(text, tokenize=True)


class VietnamesePreprocessor:
    """Scikit-learn compatible transformer for text preprocessing.

    Can be integrated directly into a `sklearn.pipeline.Pipeline` or
    passed as `preprocessor` to `TfidfVectorizer`.

    Examples:
        >>> preprocessor = VietnamesePreprocessor(tokenize=True)
        >>> cleaned = preprocessor.transform(["Thanh toán tiền điện EVN #123"])
        >>> # Or pass directly to TfidfVectorizer:
        >>> tfidf = TfidfVectorizer(preprocessor=VietnamesePreprocessor())
    """

    def __init__(
        self,
        lowercase: bool = True,
        remove_codes: bool = True,
        remove_accounts: bool = True,
        remove_specials: bool = True,
        remove_numbers: bool = True,
        tokenize: bool = True,
    ):
        self.lowercase = lowercase
        self.remove_codes = remove_codes
        self.remove_accounts = remove_accounts
        self.remove_specials = remove_specials
        self.remove_numbers = remove_numbers
        self.tokenize = tokenize

    def __call__(self, text: Any) -> str:
        """Call self as a single-string preprocessor function."""
        return preprocess(
            text,
            lowercase=self.lowercase,
            remove_codes=self.remove_codes,
            remove_accounts=self.remove_accounts,
            remove_specials=self.remove_specials,
            remove_numbers=self.remove_numbers,
            tokenize=self.tokenize,
        )

    def fit(self, X: Any, y: Any = None) -> "VietnamesePreprocessor":
        """No-op fit for scikit-learn compatibility."""
        return self

    def transform(self, X: Iterable[Any]) -> List[str]:
        """Transform an iterable of transaction descriptions into cleaned strings."""
        return [self(item) for item in X]

    def fit_transform(self, X: Iterable[Any], y: Any = None) -> List[str]:
        """Fit and transform in one step."""
        return self.transform(X)

