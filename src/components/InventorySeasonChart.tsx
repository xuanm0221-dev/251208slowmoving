"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from "recharts";
import type { Brand } from "@/types/sales";
import { BRAND_CODE_MAP } from "@/types/stagnantStock";

interface InventorySeasonChartProps {
  brand: Brand;
}

// 시즌 그룹 타입
type SeasonGroup = "정체재고" | "당시즌" | "차기시즌" | "과시즌";

// 월별 시즌 데이터
interface MonthSeasonData {
  month: string;
  정체재고: { stock_amt: number; sales_amt: number };
  과시즌: { stock_amt: number; sales_amt: number };
  당시즌: { stock_amt: number; sales_amt: number };
  차기시즌: { stock_amt: number; sales_amt: number };
  total_stock_amt: number;
  total_sales_amt: number;
}

// API 응답 타입
interface InventorySeasonChartResponse {
  year2024: MonthSeasonData[];
  year2025: MonthSeasonData[];
  meta: {
    brand: string;
    thresholdPct: number;
    currentYear: string;
    nextYear: string;
  };
}

// 탭 타입
type ChartMode = "전년대비" | "매출액대비";

// 색상 정의
const COLORS = {
  // 전년(2024년)
  prev: {
    정체재고: "#FF4081",  // 핫핑크
    과시즌: "#D1D5DB",    // 연그레이
    당시즌: "#7DD3FC",    // 하늘색
    차기시즌: "#C4B5FD",  // 연보라
  },
  // 당년(2025년)
  curr: {
    정체재고: "#DC2626",  // 빨강
    과시즌: "#6B7280",    // 회색
    당시즌: "#2563EB",    // 파랑
    차기시즌: "#7C3AED",  // 보라
  },
  // YOY 라인
  yoy: "#FDA4AF",  // 파스텔 핑크
};

// 시즌 순서 (스택 순서: 아래부터 위로)
const SEASON_ORDER: SeasonGroup[] = ["과시즌", "당시즌", "차기시즌", "정체재고"];

// 숫자 포맷팅 함수
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString("ko-KR");
}

function formatAmountM(num: number): string {
  const mValue = Math.round(num / 1_000_000);
  return mValue.toLocaleString("ko-KR") + "M";
}

function formatPercent(num: number): string {
  return (num * 100).toFixed(0) + "%";
}

// 재고주수 계산 (소수점 1자리)
function calcStockWeeks(stockAmt: number, salesAmt: number, daysInMonth: number = 30): string {
  if (salesAmt <= 0) return "-";
  const weekSales = (salesAmt / daysInMonth) * 7;
  if (weekSales <= 0) return "-";
  const weeks = stockAmt / weekSales;
  return weeks.toFixed(1) + "주";
}

// 월의 일수 계산
function getDaysInMonth(yyyymm: string): number {
  if (yyyymm.length !== 6) return 30;
  const year = parseInt(yyyymm.slice(0, 4), 10);
  const month = parseInt(yyyymm.slice(4, 6), 10);
  return new Date(year, month, 0).getDate();
}

// 커스텀 툴팁 - 전년대비 모드
interface YoYTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  data2024: MonthSeasonData[];
  data2025: MonthSeasonData[];
}

const YoYTooltip = ({ active, payload, label, data2024, data2025 }: YoYTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const chartData = payload[0]?.payload;
  if (!chartData) return null;

  const monthIdx = chartData.monthIdx;
  const curr = data2025[monthIdx];
  const prev = data2024[monthIdx];

  if (!curr) return null;

  const daysInMonth = getDaysInMonth(curr.month);
  const yoy = prev?.total_stock_amt > 0 
    ? ((curr.total_stock_amt / prev.total_stock_amt) * 100).toFixed(1) 
    : "-";

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-3 text-xs shadow-lg min-w-[280px]">
      <div className="font-bold text-gray-800 mb-2 border-b pb-2">
        25년 {parseInt(curr.month.slice(-2))}월
      </div>
      <div className="space-y-1 mb-3">
        <div className="flex justify-between">
          <span className="text-gray-600">당년 재고액:</span>
          <span className="font-medium">{formatNumber(curr.total_stock_amt / 1_000_000)}M</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">전년 재고액:</span>
          <span className="font-medium">{formatNumber((prev?.total_stock_amt || 0) / 1_000_000)}M</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">YOY:</span>
          <span className="font-medium text-pink-500">{yoy}%</span>
        </div>
      </div>
      <div className="border-t pt-2">
        <div className="font-medium text-gray-700 mb-2">시즌별 상세 (당년 재고 기준):</div>
        {SEASON_ORDER.slice().reverse().map((season) => {
          const seasonData = curr[season];
          const stockWeeks = calcStockWeeks(seasonData.stock_amt, seasonData.sales_amt, daysInMonth);
          return (
            <div key={season} className="flex items-center gap-2 py-0.5">
              <span 
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: COLORS.curr[season] }}
              />
              <span className="text-gray-600 w-16">{season}:</span>
              <span className="flex-1 text-right">
                재고 {formatNumber(seasonData.stock_amt / 1_000_000)}M / 
                매출 {formatNumber(seasonData.sales_amt / 1_000_000)}M / 
                {stockWeeks}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 커스텀 툴팁 - 매출액대비 모드
interface SalesTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  data2024: MonthSeasonData[];
  data2025: MonthSeasonData[];
}

const SalesTooltip = ({ active, payload, label, data2024, data2025 }: SalesTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const chartData = payload[0]?.payload;
  if (!chartData) return null;

  const monthIdx = chartData.monthIdx;
  const curr = data2025[monthIdx];
  const prev = data2024[monthIdx];

  if (!curr) return null;

  const daysInMonth = getDaysInMonth(curr.month);
  const totalStockWeeks = calcStockWeeks(curr.total_stock_amt, curr.total_sales_amt, daysInMonth);

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-3 text-xs shadow-lg min-w-[260px]">
      <div className="font-bold text-gray-800 mb-2 border-b pb-2">
        25년 {parseInt(curr.month.slice(-2))}월
      </div>
      
      {/* 판매 요약 */}
      <div className="mb-3">
        <div className="font-medium text-gray-700 mb-1">■ 판매 요약</div>
        <div className="flex justify-between pl-2">
          <span className="text-gray-600">전체 매출액:</span>
          <span className="font-medium">{formatNumber(curr.total_sales_amt / 1_000_000)}M</span>
        </div>
        <div className="pl-2 mt-1 text-gray-500">시즌별 판매 (당년):</div>
        {SEASON_ORDER.slice().reverse().map((season) => (
          <div key={season} className="flex items-center gap-1 pl-4 py-0.5">
            <span 
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: COLORS.curr[season] }}
            />
            <span className="text-gray-600">{season}:</span>
            <span className="ml-auto">{formatNumber(curr[season].sales_amt / 1_000_000)}M</span>
          </div>
        ))}
      </div>
      
      {/* 재고 요약 */}
      <div className="border-t pt-2">
        <div className="font-medium text-gray-700 mb-1">■ 재고 요약</div>
        <div className="flex justify-between pl-2">
          <span className="text-gray-600">전체 재고액:</span>
          <span className="font-medium">{formatNumber(curr.total_stock_amt / 1_000_000)}M</span>
        </div>
        <div className="pl-2 mt-1 text-gray-500">시즌별 재고 (당년):</div>
        {SEASON_ORDER.slice().reverse().map((season) => (
          <div key={season} className="flex items-center gap-1 pl-4 py-0.5">
            <span 
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: COLORS.curr[season] }}
            />
            <span className="text-gray-600">{season}:</span>
            <span className="ml-auto">{formatNumber(curr[season].stock_amt / 1_000_000)}M</span>
          </div>
        ))}
        <div className="flex justify-between pl-2 mt-2 pt-2 border-t border-gray-200">
          <span className="text-gray-600 font-medium">재고주수:</span>
          <span className="font-medium text-blue-600">{totalStockWeeks}</span>
        </div>
      </div>
    </div>
  );
};

export default function InventorySeasonChart({ brand }: InventorySeasonChartProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventorySeasonChartResponse | null>(null);
  const [mode, setMode] = useState<ChartMode>("전년대비");

  const brandCode = BRAND_CODE_MAP[brand] || "M";

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          brand: brandCode,
          thresholdPct: "0.01",
        });
        const response = await fetch(`/api/inventory-season-chart?${params}`);
        if (!response.ok) {
          throw new Error("데이터를 불러오는데 실패했습니다.");
        }
        const result: InventorySeasonChartResponse = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [brandCode]);

  // 차트 데이터 생성
  const chartData = useMemo(() => {
    if (!data) return [];

    return data.year2025.map((curr, idx) => {
      const prev = data.year2024[idx];
      const monthNum = parseInt(curr.month.slice(-2));
      
      // YOY 계산
      const yoy = prev?.total_stock_amt > 0 
        ? (curr.total_stock_amt / prev.total_stock_amt - 1) * 100 
        : 0;

      if (mode === "전년대비") {
        // 전년대비 모드: 왼쪽=전년 재고, 오른쪽=당년 재고
        return {
          month: `2025-${String(monthNum).padStart(2, "0")}`,
          monthIdx: idx,
          // 전년 재고 (왼쪽 막대)
          prev_과시즌: (prev?.과시즌?.stock_amt || 0) / 1_000_000,
          prev_당시즌: (prev?.당시즌?.stock_amt || 0) / 1_000_000,
          prev_차기시즌: (prev?.차기시즌?.stock_amt || 0) / 1_000_000,
          prev_정체재고: (prev?.정체재고?.stock_amt || 0) / 1_000_000,
          // 당년 재고 (오른쪽 막대)
          curr_과시즌: (curr.과시즌?.stock_amt || 0) / 1_000_000,
          curr_당시즌: (curr.당시즌?.stock_amt || 0) / 1_000_000,
          curr_차기시즌: (curr.차기시즌?.stock_amt || 0) / 1_000_000,
          curr_정체재고: (curr.정체재고?.stock_amt || 0) / 1_000_000,
          // YOY
          yoy,
          // 비율 라벨용 데이터
          prev_total: (prev?.total_stock_amt || 0) / 1_000_000,
          curr_total: curr.total_stock_amt / 1_000_000,
        };
      } else {
        // 매출액대비 모드: 왼쪽=당년 판매, 오른쪽=당년 재고
        return {
          month: `2025-${String(monthNum).padStart(2, "0")}`,
          monthIdx: idx,
          // 당년 판매 (왼쪽 막대)
          sales_과시즌: (curr.과시즌?.sales_amt || 0) / 1_000_000,
          sales_당시즌: (curr.당시즌?.sales_amt || 0) / 1_000_000,
          sales_차기시즌: (curr.차기시즌?.sales_amt || 0) / 1_000_000,
          sales_정체재고: (curr.정체재고?.sales_amt || 0) / 1_000_000,
          // 당년 재고 (오른쪽 막대)
          curr_과시즌: (curr.과시즌?.stock_amt || 0) / 1_000_000,
          curr_당시즌: (curr.당시즌?.stock_amt || 0) / 1_000_000,
          curr_차기시즌: (curr.차기시즌?.stock_amt || 0) / 1_000_000,
          curr_정체재고: (curr.정체재고?.stock_amt || 0) / 1_000_000,
          // YOY (재고 기준)
          yoy,
          // 합계
          sales_total: curr.total_sales_amt / 1_000_000,
          curr_total: curr.total_stock_amt / 1_000_000,
        };
      }
    });
  }, [data, mode]);

  // Y축 포맷
  const formatYAxis = (value: number) => {
    return Math.round(value).toLocaleString();
  };

  // 커스텀 라벨 렌더러 (막대 위에 비율 표시)
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value, dataKey, index } = props;
    if (!chartData[index]) return null;

    const item = chartData[index];
    let labelText = "";
    let labelY = y - 5;

    if (mode === "전년대비") {
      // 전년 막대 위에 전년 비율, 당년 막대 위에 당년 비율
      const prevTotal = item.prev_total ?? 0;
      const currTotal = item.curr_total ?? 0;
      if (dataKey === "prev_정체재고" && prevTotal > 0) {
        const ratio = ((item.prev_정체재고 || 0) / prevTotal * 100).toFixed(0);
        labelText = `${ratio}%`;
      } else if (dataKey === "curr_정체재고" && currTotal > 0) {
        const ratio = ((item.curr_정체재고 || 0) / currTotal * 100).toFixed(0);
        labelText = `${ratio}%`;
      }
    } else {
      // 매출액대비 모드
      const salesTotal = item.sales_total ?? 0;
      const currTotal = item.curr_total ?? 0;
      if (dataKey === "sales_정체재고" && salesTotal > 0) {
        const ratio = ((item.sales_정체재고 || 0) / salesTotal * 100).toFixed(0);
        labelText = `${ratio}%`;
      } else if (dataKey === "curr_정체재고" && currTotal > 0) {
        const ratio = ((item.curr_정체재고 || 0) / currTotal * 100).toFixed(0);
        labelText = `${ratio}%`;
      }
    }

    if (!labelText) return null;

    return (
      <text 
        x={x + width / 2} 
        y={labelY} 
        fill={COLORS.curr.정체재고}
        fontSize={10}
        fontWeight="bold"
        textAnchor="middle"
      >
        {labelText}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="card mb-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">데이터 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card mb-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="card mb-4">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span className="text-purple-500">📊</span>
          재고택금액 추이 (시즌별, M단위) - 당년재고/매출액 비교
        </h2>
        
        {/* 모드 전환 탭 */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {(["전년대비", "매출액대비"] as ChartMode[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === tab
                  ? "bg-purple-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 30, right: 60, left: 20, bottom: 5 }}
            barCategoryGap="15%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#d1d5db" }}
              tickFormatter={(value) => value.slice(5)} // "2025-01" -> "01"
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#d1d5db" }}
              tickFormatter={formatYAxis}
              label={{ 
                value: "M", 
                angle: 0, 
                position: "top",
                offset: 10,
                style: { fontSize: 11, fill: "#6b7280" }
              }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#FDA4AF" }}
              axisLine={{ stroke: "#FDA4AF" }}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              domain={[-50, 50]}
              label={{ 
                value: "YOY", 
                angle: 0, 
                position: "top",
                offset: 10,
                style: { fontSize: 11, fill: "#FDA4AF" }
              }}
            />
            
            <Tooltip 
              content={
                mode === "전년대비" 
                  ? <YoYTooltip data2024={data.year2024} data2025={data.year2025} />
                  : <SalesTooltip data2024={data.year2024} data2025={data.year2025} />
              }
            />

            {mode === "전년대비" ? (
              <>
                {/* 전년 재고 막대 (왼쪽) */}
                <Bar yAxisId="left" dataKey="prev_과시즌" stackId="prev" fill={COLORS.prev.과시즌} name="24년 과시즌" />
                <Bar yAxisId="left" dataKey="prev_당시즌" stackId="prev" fill={COLORS.prev.당시즌} name="24년 당시즌" />
                <Bar yAxisId="left" dataKey="prev_차기시즌" stackId="prev" fill={COLORS.prev.차기시즌} name="24년 차기시즌" />
                <Bar yAxisId="left" dataKey="prev_정체재고" stackId="prev" fill={COLORS.prev.정체재고} name="24년 정체재고" label={renderCustomLabel} />
                
                {/* 당년 재고 막대 (오른쪽) */}
                <Bar yAxisId="left" dataKey="curr_과시즌" stackId="curr" fill={COLORS.curr.과시즌} name="25년 과시즌" />
                <Bar yAxisId="left" dataKey="curr_당시즌" stackId="curr" fill={COLORS.curr.당시즌} name="25년 당시즌" />
                <Bar yAxisId="left" dataKey="curr_차기시즌" stackId="curr" fill={COLORS.curr.차기시즌} name="25년 차기시즌" />
                <Bar yAxisId="left" dataKey="curr_정체재고" stackId="curr" fill={COLORS.curr.정체재고} name="25년 정체재고" label={renderCustomLabel} />
              </>
            ) : (
              <>
                {/* 당년 판매 막대 (왼쪽) */}
                <Bar yAxisId="left" dataKey="sales_과시즌" stackId="sales" fill={COLORS.curr.과시즌} name="25년 판매 과시즌" />
                <Bar yAxisId="left" dataKey="sales_당시즌" stackId="sales" fill={COLORS.curr.당시즌} name="25년 판매 당시즌" />
                <Bar yAxisId="left" dataKey="sales_차기시즌" stackId="sales" fill={COLORS.curr.차기시즌} name="25년 판매 차기시즌" />
                <Bar yAxisId="left" dataKey="sales_정체재고" stackId="sales" fill={COLORS.curr.정체재고} name="25년 판매 정체재고" label={renderCustomLabel} />
                
                {/* 당년 재고 막대 (오른쪽) */}
                <Bar yAxisId="left" dataKey="curr_과시즌" stackId="curr" fill={COLORS.curr.과시즌} name="25년 재고 과시즌" />
                <Bar yAxisId="left" dataKey="curr_당시즌" stackId="curr" fill={COLORS.curr.당시즌} name="25년 재고 당시즌" />
                <Bar yAxisId="left" dataKey="curr_차기시즌" stackId="curr" fill={COLORS.curr.차기시즌} name="25년 재고 차기시즌" />
                <Bar yAxisId="left" dataKey="curr_정체재고" stackId="curr" fill={COLORS.curr.정체재고} name="25년 재고 정체재고" label={renderCustomLabel} />
              </>
            )}

            {/* YOY 라인 */}
            <Line 
              yAxisId="right"
              type="monotone"
              dataKey="yoy"
              stroke={COLORS.yoy}
              strokeWidth={2}
              dot={{ fill: COLORS.yoy, r: 4 }}
              name="YOY"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-center gap-6 text-xs text-gray-600">
          {mode === "전년대비" ? (
            <>
              <div className="flex items-center gap-3">
                <span className="font-medium">당년-24년:</span>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.prev.과시즌 }}></span>
                  <span>과시즌</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.prev.당시즌 }}></span>
                  <span>당시즌</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.prev.차기시즌 }}></span>
                  <span>차기시즌</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.prev.정체재고 }}></span>
                  <span>정체재고</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">당년-25년:</span>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.curr.과시즌 }}></span>
                  <span>과시즌</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.curr.당시즌 }}></span>
                  <span>당시즌</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.curr.차기시즌 }}></span>
                  <span>차기시즌</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.curr.정체재고 }}></span>
                  <span>정체재고</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="font-medium">당년-판매(매출):</span>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.curr.과시즌 }}></span>
                  <span>과시즌</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.curr.당시즌 }}></span>
                  <span>당시즌</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.curr.차기시즌 }}></span>
                  <span>차기시즌</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.curr.정체재고 }}></span>
                  <span>정체재고</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">당년-재고:</span>
                <span className="text-gray-500">(동일 색상)</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <span className="w-6 h-0.5" style={{ backgroundColor: COLORS.yoy }}></span>
            <span>YOY</span>
          </div>
        </div>
      </div>
    </div>
  );
}

