"use client";

import { ItemTab, ITEM_TABS, Brand, BRANDS } from "@/types/sales";
import { cn } from "@/lib/utils";

interface ItemTabsProps {
  selectedTab: ItemTab;
  onTabChange: (tab: ItemTab) => void;
  brand: Brand;
  // 모두비교 모드
  showAllItems: boolean;
  setShowAllItems: (show: boolean) => void;
  // 성장률 관련 props
  growthRate: number;
  setGrowthRate: (value: number) => void;
}

export default function ItemTabs({ 
  selectedTab, 
  onTabChange, 
  brand,
  showAllItems,
  setShowAllItems,
  growthRate,
  setGrowthRate,
}: ItemTabsProps) {
  // 현재 브랜드의 색상 정보 가져오기
  const brandInfo = BRANDS.find(b => b.key === brand);

  const tabLabels: Record<ItemTab, { icon: string; label: string }> = {
    전체: { icon: "👋", label: "아이템합계" },
    Shoes: { icon: "👟", label: "슈즈" },
    Headwear: { icon: "🧢", label: "모자" },
    Bag: { icon: "👜", label: "가방" },
    Acc_etc: { icon: "⭐", label: "기타악세" },
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 아이템 탭 */}
      {ITEM_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2",
            selectedTab === tab 
              ? `${brandInfo?.activeColor} ${brandInfo?.activeTextColor}` 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <span>{tabLabels[tab].icon}</span>
          <span>{tabLabels[tab].label}</span>
        </button>
      ))}

      {/* 재고주수 한번에 보기 버튼 */}
      <button
        onClick={() => setShowAllItems(!showAllItems)}
        className={cn(
          "px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1.5 border",
          showAllItems
            ? "bg-purple-600 text-white border-purple-600"
            : "bg-white text-purple-600 border-purple-300 hover:bg-purple-50"
        )}
        title="차트에서 모든 아이템 비교"
      >
        <span>📊</span>
        <span>재고주수 한번에 보기</span>
      </button>

      {/* 성장률 입력 필드 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-lg">📈</span>
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            성장률
          </label>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={growthRate}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value > 0) {
                setGrowthRate(value);
              }
            }}
            className="w-16 px-3 py-1.5 bg-white border border-blue-300 rounded-md text-sm font-semibold text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            min="1"
            step="1"
            title="전년동월 대비 성장률 (%)"
          />
          <span className="text-xs text-gray-500 font-medium">%</span>
        </div>
        <span className="text-xs text-gray-500 ml-1" title="전년동월 대비 성장률">
          (전년동월 대비)
        </span>
      </div>
    </div>
  );
}
