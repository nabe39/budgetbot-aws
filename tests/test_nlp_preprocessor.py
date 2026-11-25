"""Unit tests for Vietnamese NLP Text Preprocessor (KAN-14 / FR-09)."""
import unicodedata
import pytest

from src.nlp.preprocessor import (
    VietnamesePreprocessor,
    preprocess,
    normalize_unicode,
    remove_transaction_codes,
    remove_account_numbers,
    remove_special_characters,
    remove_standalone_numbers,
    tokenize_vietnamese,
    clean_bank_description,
)


class TestUnicodeNormalization:
    def test_nfd_to_nfc(self):
        """Verify decomposed Unicode (NFD) is converted to composed Unicode (NFC)."""
        target = "tiền điện"
        # Generate true NFD decomposed string
        nfd_text = unicodedata.normalize("NFD", target)
        assert unicodedata.is_normalized("NFD", nfd_text)
        assert not unicodedata.is_normalized("NFC", nfd_text)
        
        nfc_text = normalize_unicode(nfd_text)
        assert nfc_text == target
        assert len(nfc_text) < len(nfd_text)
        assert unicodedata.is_normalized("NFC", nfc_text)

    def test_already_nfc(self):
        """Verify NFC text remains unchanged."""
        text = "Cà phê Highland"
        assert normalize_unicode(text) == text
        assert unicodedata.is_normalized("NFC", normalize_unicode(text))

    def test_empty_and_none(self):
        assert normalize_unicode("") == ""
        assert normalize_unicode(None) == ""


class TestTransactionCodeRemoval:
    def test_remove_ft_code(self):
        text = "Giao dich FT2601029484910 chuyen tien"
        res = remove_transaction_codes(text)
        assert "FT2601029484910" not in res
        assert "chuyen tien" in res

    def test_remove_trx_code(self):
        text = "GD ma TRX260148291038 qua he thong Napas"
        res = remove_transaction_codes(text)
        assert "TRX260148291038" not in res
        assert "he thong Napas" in res

    def test_remove_pos_and_bds(self):
        text = "POS00129381 thanh toan the BDS001298319"
        res = remove_transaction_codes(text)
        assert "POS00129381" not in res
        assert "BDS001298319" not in res
        assert "thanh toan the" in res

    def test_remove_banking_gateway_prefixes(self):
        text = "MBVCB.123456789 chuyen khoan napas"
        res = remove_transaction_codes(text)
        assert "MBVCB.123456789" not in res
        assert "chuyen khoan napas" in res


class TestAccountNumberRemoval:
    def test_remove_stk_pattern(self):
        text = "Chuyen tien den STK 091238491823 cho Nguyen Van A"
        res = remove_account_numbers(text)
        assert "091238491823" not in res
        assert "STK" not in res
        assert "Nguyen Van A" in res

    def test_remove_standalone_long_digits(self):
        text = "Thanh toan don hang 849201938192 tiki"
        res = remove_account_numbers(text)
        assert "849201938192" not in res
        assert "tiki" in res

    def test_remove_phone_numbers(self):
        text = "Nap tien dien thoai 0987654321 mang viettel"
        res = remove_account_numbers(text)
        assert "0987654321" not in res
        assert "viettel" in res

    def test_remove_dates_and_timestamps(self):
        text = "Giao dich ngay 15/05/2026 luc 14:30 thanh toan"
        res = remove_account_numbers(text)
        assert "15/05/2026" not in res
        assert "14:30" not in res
        assert "thanh toan" in res


class TestSpecialCharacterAndNumberRemoval:
    def test_remove_special_characters(self):
        text = "Thanh toán tiền điện EVN #tháng 05! @Highlands ($500)?"
        res = remove_special_characters(text)
        for char in "#!@$?()":
            assert char not in res
        assert "Thanh toán tiền điện EVN" in res

    def test_remove_standalone_numbers(self):
        text = "mua 2 ve xem phim 123 cgv"
        res = remove_standalone_numbers(text)
        assert "123" not in res
        assert "cgv" in res


class TestVietnameseTokenization:
    def test_compound_word_tokenization(self):
        """Verify compound words are joined with underscore by pyvi."""
        text = "thanh toán tiền điện tại nhà hàng"
        tokenized = tokenize_vietnamese(text)
        # Expected compounds in Vietnamese: thanh_toán, tiền_điện, nhà_hàng
        assert "thanh_toán" in tokenized
        assert "nhà_hàng" in tokenized

    def test_empty_tokenization(self):
        assert tokenize_vietnamese("") == ""
        assert tokenize_vietnamese("   ") == ""


class TestFullPreprocessingPipeline:
    def test_end_to_end_pipeline(self):
        raw = "GD ma TRX260148291038: Thanh toan tien dien EVN thang 05/2026 tai STK 091238491823!"
        res = preprocess(raw)
        # Should be lowercase
        assert res == res.lower()
        # Should NOT contain code, STK, punctuation
        assert "trx" not in res
        assert "091238491823" not in res
        assert "!" not in res
        assert ":" not in res
        # Should contain key semantic terms
        assert "thanh_toán" in res or "thanh toan" in res
        assert "tiền_điện" in res or "tien dien" in res
        assert "evn" in res

    def test_nfd_input_handling(self):
        # Decomposed input
        raw = unicodedata.normalize("NFD", "tiền ăn sáng phở bò")
        res = preprocess(raw)
        assert unicodedata.is_normalized("NFC", res)
        assert "ăn" in res
        assert "sáng" in res

    def test_edge_cases(self):
        assert preprocess("") == ""
        assert preprocess(None) == ""
        assert preprocess("   ") == ""
        assert preprocess("123456789") == ""
        assert preprocess("!!!@@@###$$$") == ""

    def test_clean_bank_description_alias(self):
        assert clean_bank_description("Highlands Coffee Nguyen Trai") != ""


class TestScikitLearnTransformerIntegration:
    def test_callable_in_vectorizer(self):
        preprocessor = VietnamesePreprocessor(tokenize=True)
        sample = "Thanh toan tien nha thang 06"
        res = preprocessor(sample)
        assert isinstance(res, str)
        assert len(res) > 0

    def test_transform_batch(self):
        preprocessor = VietnamesePreprocessor()
        batch = [
            "Highlands Coffee Nguyen Trai",
            "Tien an trua com tam",
            "Chuyen tien tra phong tro",
        ]
        results = preprocessor.transform(batch)
        assert len(results) == 3
        for item in results:
            assert isinstance(item, str)
            assert item == item.lower()
