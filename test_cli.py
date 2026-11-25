"""Interactive CLI test for BudgetBot NLP Classifier.

Run:
    python test_cli.py
"""
import sys
from pathlib import Path

# Ensure root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.nlp.predictor import predict_transaction


def main():
    print("=" * 70)
    print("   BUDGETBOT - CÔNG CỤ TEST NHANH MÔ HÌNH PHÂN LOẠI NLP")
    print("=" * 70)
    print("💡 Nhập nội dung giao dịch bất kỳ để xem mô hình phân loại.")
    print("💡 Gõ 'exit' hoặc 'quit' để thoát.\n")

    while True:
        try:
            desc = input("👉 Nhập mô tả giao dịch: ").strip()
            if not desc:
                continue
            if desc.lower() in ("exit", "quit", "q"):
                print("Tạm biệt!")
                break

            amt_input = input("   Nhập số tiền (VND, bỏ trống nếu không có): ").strip()
            amount = None
            if amt_input:
                try:
                    amount = float(amt_input.replace(".", "").replace(",", ""))
                except ValueError:
                    amount = None

            res = predict_transaction(description=desc, amount=amount)

            print("\n" + "─" * 50)
            print(f"  🏷️  Danh mục (Category):      {res['category']}")
            print(f"  🎯 Độ tin cậy (Confidence):  {res['confidence']*100:.2f}%")
            print(f"  🚦 Mức độ (Confidence Level): {res['confidence_level'].upper()}")
            print(f"  ⚙️  Thuật toán (Engine):      {res.get('engine', 'unknown')}")
            print("─" * 50 + "\n")

        except (KeyboardInterrupt, EOFError):
            print("\nĐã dừng công cụ test.")
            break


if __name__ == "__main__":
    main()
