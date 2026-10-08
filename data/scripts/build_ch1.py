"""第一章数据处理：data/raw/* → public/data/*.json

运行：python data/scripts/build_ch1.py

1. 世界 / 中国 / 英国人均 GDP（2011 年国际元）
   - 1820—2022：Maddison Project Database 2023，Regional data 表的 World GDP pc；GDPpc 表的 CHN、GBR。
   - 2023—2025：MPD 2023 只到 2022 年，按世界银行 WDI 人均 GDP（PPP）的逐年增长率外推。
   - 公元 1—1700 年的世界值：MPD 2023 未提供世界汇总，取 Maddison (2010) 原始数据库的
     World Average（1990 年 GK 国际元），按两版 1820 年世界值之比换算到 2011 年国际元（比值链接）。
2. 中国三次产业就业人员（1952—2024）
   - 《中国统计年鉴 2025》表 4-2“按三次产业分就业人员数（年底数）”，由官方表格图片转录，
     已逐年校验“三产之和 = 合计”。
"""
import csv
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "public" / "data"


def r(v, n=1):
    return round(float(v), n)


# ---------------- 人均 GDP ----------------
reg = pd.read_excel(RAW / "mpd2023_web.xlsx", sheet_name="Regional data", header=None)
world23 = {int(y): float(v) for y, v in reg[[0, 9]].iloc[2:].dropna().values}

gpc = pd.read_excel(RAW / "mpd2023_web.xlsx", sheet_name="GDPpc", header=None)
codes = gpc.iloc[2].tolist()


def country(code):
    j = codes.index(code)
    s = gpc[[0, j]].iloc[3:].dropna()
    return [{"x": int(y), "y": r(v)} for y, v in s.values]


md10 = pd.read_excel(RAW / "md2010_horizontal.xlsx", sheet_name="PerCapita GDP", header=None)
years10 = md10.iloc[2].tolist()
row10 = md10[md10[0].astype(str).str.strip() == "World Average"].iloc[0].tolist()
world10 = {int(y): float(v) for y, v in zip(years10, row10) if isinstance(y, (int, float)) and y == y and v == v and isinstance(v, (int, float))}

link = world23[1820] / world10[1820]
world = [{"x": y, "y": r(world10[y] * link), "spliced": True} for y in sorted(world10) if y < 1820]
world += [{"x": y, "y": r(v)} for y, v in sorted(world23.items())]

# ---- 2023—2025 年延伸：以世界银行 WDI 人均 GDP（PPP，2021 年不变国际元）的逐年增长率外推 ----
wb = json.load(open(RAW / "worldbank_NY.GDP.PCAP.PP.KD_2015-2025.json", encoding="utf-8"))[1]
WB = {}
for row in wb:
    if row["value"] is not None:
        WB.setdefault(row["countryiso3code"], {})[int(row["date"])] = row["value"]


def extend(points, iso):
    base = points[-1]
    assert base["x"] == 2022, (iso, base)
    for yr in (2023, 2024, 2025):
        points.append({"x": yr, "y": r(base["y"] * WB[iso][yr] / WB[iso][2022]), "ext": True})
    return points


world = extend(world, "WLD")
china = extend(country("CHN"), "CHN")
uk = extend(country("GBR"), "GBR")

gdp = {
    "meta": {
        "id": "maddison_gdp",
        "title": "世界、中国、英国人均 GDP（公元 1 年—2025 年）",
        "source": "Maddison Project Database 2023（Bolt & van Zanden, 2024）；1820 年以前世界值：Maddison (2010)；2023—2025 年按世界银行 WDI 增长率延伸",
        "url": "https://www.rug.nl/ggdc/historicaldevelopment/maddison/releases/maddison-project-database-2023",
        "status": "ok",
        "unit": "2011 年国际元",
        "note": f"原始文件见 data/raw/。1820 年以前的世界值为 Maddison (2010) 1990 年 GK 国际元，按 1820 年两版之比（{link:.3f}）换算，仅有公元 1、1000、1500、1600、1700 年等基准年份；MPD 2023 数据截至 2022 年，2023—2025 年以世界银行 WDI 人均 GDP（PPP，2021 年不变国际元，NY.GDP.PCAP.PP.KD，2026-07-13 更新）的逐年增长率外推。两段均以虚线表示。",
        "usedIn": "1.1 两千年长卷",
        "citation": "Bolt, J. and J. L. van Zanden (2024), “Maddison style estimates of the evolution of the world economy: A new 2023 update”, Journal of Economic Surveys.",
    },
    "link_ratio_1820": round(link, 4),
    "series": [
        {"key": "world", "name": "世界", "color": "--c-red", "data": world},
        {"key": "china", "name": "中国", "color": "--c-blue", "data": china},
        {"key": "uk", "name": "英国", "color": "--c-ochre", "data": uk},
    ],
}
(OUT / "maddison_gdp.json").write_text(json.dumps(gdp, ensure_ascii=False, indent=1), encoding="utf-8")
print("maddison_gdp.json:", {s["key"]: len(s["data"]) for s in gdp["series"]}, "link", round(link, 4))

# ---------------- 三次产业就业 ----------------
rows = list(csv.DictReader(open(RAW / "nbs2025_C04-02_transcribed.csv", encoding="utf-8")))
for row in rows:
    t = int(row["total"])
    assert abs(t - sum(int(row[k]) for k in ("primary", "secondary", "tertiary"))) <= 1, row["year"]
emp = {
    "meta": {
        "id": "china_employment",
        "title": "中国三次产业就业人员（1952—2024）",
        "source": "国家统计局《中国统计年鉴 2025》表 4-2 按三次产业分就业人员数（年底数）",
        "url": "https://www.stats.gov.cn/sj/ndsj/2025/html/C04-02.jpg",
        "status": "ok",
        "unit": "万人；构成为 %",
        "note": "由官方表格图片转录（原图与转录 CSV 见 data/raw/），已逐年校验三次产业之和等于合计。1990 年就业人员数较 1989 年跳升，系统计口径调整所致。",
        "usedIn": "1.3 七十年的人口迁徙",
    },
    "data": [
        {
            "year": int(x["year"]), "total": int(x["total"]),
            "primary": int(x["primary"]), "secondary": int(x["secondary"]), "tertiary": int(x["tertiary"]),
            "p1": float(x["primary_pct"]), "p2": float(x["secondary_pct"]), "p3": float(x["tertiary_pct"]),
        }
        for x in rows
    ],
}
(OUT / "china_employment.json").write_text(json.dumps(emp, ensure_ascii=False, indent=1), encoding="utf-8")
print("china_employment.json:", len(emp["data"]), "years")
