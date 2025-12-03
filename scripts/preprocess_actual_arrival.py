"""
실제 입고 재고자산 데이터 전처리 스크립트
- CSV 파일을 읽어서 JSON으로 변환
- public/data/accessory_actual_arrival_summary.json 생성
"""

import pandas as pd
import json
from pathlib import Path
from typing import Dict

# ========== 설정 ==========
# 실제 입고 원천 데이터 경로 (월별 CSV)
ACTUAL_ARRIVAL_DATA_PATH = Path(r"C:\3.accweekcover\data\(acutal)INTarrival")

# 출력 JSON 경로
OUTPUT_PATH = Path(__file__).parent.parent / "public" / "data"

# 처리할 월 목록 (2025.01 ~ 2025.11)
ACTUAL_MONTH_FILES = [
    "2025.01",
    "2025.02",
    "2025.03",
    "2025.04",
    "2025.05",
    "2025.06",
    "2025.07",
    "2025.08",
    "2025.09",
    "2025.10",
    "2025.11",
]

VALID_BRANDS = {"MLB", "MLB KIDS", "DISCOVERY"}
VALID_MAJOR_CATEGORY = "饰品"  # 대분류 필터 (饰品만 사용)
VALID_ITEM_CATEGORIES = {"Shoes", "Headwear", "Bag", "Acc_etc"}

# CSV 컬럼 이름
COL_BRAND = "产品品牌"
COL_MAJOR = "产品大分类"
COL_ITEM = "产品中分类"
COL_AMOUNT = "实际入库"


def process_actual_arrival_data() -> Dict:
    """실제 입고 CSV 파일들을 읽어서 집계"""
    brands: Dict = {
        "MLB": {},
        "MLB KIDS": {},
        "DISCOVERY": {},
    }
    month_set = set()

    for month in ACTUAL_MONTH_FILES:
        file_path = ACTUAL_ARRIVAL_DATA_PATH / f"{month}.csv"

        if not file_path.exists():
            print(f"[WARNING] 파일 없음: {file_path}")
            continue

        print(f"처리 중: {file_path}")

        try:
            # CSV 읽기 (BOM 처리 포함)
            df = pd.read_csv(
                file_path,
                encoding="utf-8-sig",
                dtype={
                    COL_BRAND: str,
                    COL_MAJOR: str,
                    COL_ITEM: str,
                    COL_AMOUNT: str,  # 쉼표 제거 위해 문자열로 읽기
                },
            )

            # 브랜드 필터
            df = df[df[COL_BRAND].isin(VALID_BRANDS)]
            if df.empty:
                continue

            # 대분류 필터 (饰品만)
            df = df[df[COL_MAJOR] == VALID_MAJOR_CATEGORY]
            if df.empty:
                continue

            # 아이템 필터
            df = df[df[COL_ITEM].isin(VALID_ITEM_CATEGORIES)]
            if df.empty:
                continue

            # 금액 파싱 (쉼표 제거)
            df[COL_AMOUNT] = (
                df[COL_AMOUNT].astype(str).str.replace(",", "").astype(float)
            )

            month_set.add(month)

            # 브랜드별 집계
            for _, row in df.iterrows():
                brand_name = str(row[COL_BRAND]).strip()
                item = str(row[COL_ITEM]).strip()
                amount = (
                    float(row[COL_AMOUNT]) if pd.notna(row[COL_AMOUNT]) else 0.0
                )

                if brand_name not in VALID_BRANDS or item not in VALID_ITEM_CATEGORIES:
                    continue

                brand_data = brands[brand_name]
                if month not in brand_data:
                    brand_data[month] = {}

                month_data = brand_data[month]
                month_data[item] = month_data.get(item, 0) + amount

        except Exception as e:
            print(f"[ERROR] {file_path}: {e}")
            continue

    # 월 목록 정렬
    months = sorted(
        list(month_set),
        key=lambda m: (int(m.split(".")[0]), int(m.split(".")[1])),
    )

    return {
        "brands": brands,
        "months": months,
    }


def main():
    print("=" * 60)
    print("실제 입고 재고자산 데이터 전처리 시작")
    print("=" * 60)

    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)

    print(f"\n실제 입고 데이터 경로: {ACTUAL_ARRIVAL_DATA_PATH}")
    print(f"출력 경로: {OUTPUT_PATH}")

    print("\n실제 입고 데이터 처리 중...")
    result = process_actual_arrival_data()

    output_file = OUTPUT_PATH / "accessory_actual_arrival_summary.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n[DONE] 저장 완료: {output_file}")
    print(f"처리된 월 수: {len(result['months'])}")
    for month in result["months"]:
        print(f"  - {month}")


if __name__ == "__main__":
    main()



