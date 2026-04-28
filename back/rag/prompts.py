"""
System prompts for the JK legal assistant.

Two distinct prompts:
  GENERAL_PROMPT — for meta-questions about the Criminal Code itself
  LEGAL_PROMPT   — for specific article / crime / penalty questions

Both prompts are in Uzbek and optimized for Qwen/Ollama local inference.
"""

# ── General prompt ────────────────────────────────────────────────────────────
# Used when the user asks about the Criminal Code as a whole
# (what it is, how many articles, what sections exist, etc.)
# The metadata is injected as a JSON context block.

GENERAL_PROMPT = """\
Siz O'zbekiston Respublikasi Jinoyat Kodeksi bo'yicha professional yuridik yordamchisiz.

Foydalanuvchi Jinoyat Kodeksining umumiy tuzilishi, maqsadi yoki statistikasi haqida savol berdi.

Quyida berilgan kodeks ma'lumotnomasidan foydalanib, rasmiy va aniq javob bering.

Qoidalar:
- Faqat berilgan ma'lumotlar asosida javob bering
- Taxmin qilmang yoki o'ylab topilgan ma'lumot qo'shmang
- Javobni o'zbek tilida, rasmiy uslubda yozing
- Qisqa va aniq bo'ling (2–4 jumla)
- Agar savol berilgan ma'lumotlarda bo'lmasa, shuni ochiq ayting
"""

# ── Legal prompt ──────────────────────────────────────────────────────────────
# Used when the user asks about specific articles, crimes, or penalties.
# Retrieved chunks are injected as numbered article blocks.

LEGAL_PROMPT = """\
Siz O'zbekiston Respublikasi Jinoyat Kodeksi bo'yicha professional yuridik yordamchisiz.

Qoidalar:
1. FAQAT quyida berilgan maqolalar matniga asoslanib javob bering
2. Tegishli maqola raqamlarini har doim ko'rsating (masalan: "168-modda bo'yicha...")
3. Maqolalarda yo'q ma'lumotni hech qachon o'ylab topmang (gallyutsinatsiya qilmang)
4. Agar berilgan maqolalarda javob bo'lmasa:
   - "Berilgan maqolalarda bu haqda to'liq ma'lumot yo'q" — deb ayting
   - Qisman ma'lumot bo'lsa, uni aytib, nima topilmaganini tushuntiring
   - Hech qachon "ma'lumot topilmadi" deb qo'pol to'xtamang
5. Javobni o'zbek tilida, rasmiy-huquqiy uslubda yozing
6. Suhbat tarixini hisobga olib, izchil javob bering
7. Zarur bo'lsa, maqola qismlarini (band, qism) aniq ko'rsating
"""


def build_general_context(metadata: dict) -> str:
    """Format the metadata dict into a readable context string for the general prompt."""
    parts_text = ""
    for part in metadata.get("parts", []):
        parts_text += (
            f"  • {part['name']}: {part.get('chapters', '?')} bob, "
            f"{part.get('articles', '?')}-moddalar\n"
        )

    return (
        f"KODEKS MA'LUMOTНОМАСИ:\n"
        f"Rasmiy nomi : {metadata.get('name', '')}\n"
        f"Qisqacha    : {metadata.get('short_name', '')}\n"
        f"Qabul qilingan yil: {metadata.get('year', '')}\n"
        f"Jami moddalar soni: {metadata.get('article_count', '?')}\n"
        f"Qismlar:\n{parts_text}"
        f"Tavsif: {metadata.get('description', '')}\n"
        f"So'nggi yangilangan: {metadata.get('last_updated', '')}"
    )


def build_legal_context(chunks: list[dict]) -> str:
    """Format retrieved chunks into a numbered article context block."""
    if not chunks:
        return "Tegishli maqolalar topilmadi."

    blocks = []
    for i, c in enumerate(chunks, 1):
        meta = c.get("metadata", {})
        modda = meta.get("modda", "?")
        title = meta.get("title", "")
        score = c.get("score", 0)
        header = f"[{i}] {modda}-modda"
        if title:
            header += f": {title}"
        header += f"  (mos: {score:.2f})"
        blocks.append(f"{header}\n{c['text']}")

    return "\n\n".join(blocks)
