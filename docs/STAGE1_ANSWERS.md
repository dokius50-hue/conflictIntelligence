# Stage 1 — Data Understanding (answer before Stage 2)

Run Perplexity extraction prompt manually 3–4 times. Pull Twitter timelines from 5 OSINT and 3 analyst accounts manually. Save all raw output to `/logs/raw/YYYY-MM-DD-HH-source.json`.

Answer in writing below before starting Stage 2. These answers shape sanitization and validation logic.

---

1. **What fields are always present in Perplexity output?**


2. **What is the most common null or approximate field?**


3. **What does a hallucination look like vs. a composite event?**


4. **How often does Perplexity fabricate or mangle the source URL?**


5. **How do OSINT tweet fragments differ from analyst tweets structurally?**


6. **What is the max and min complexity of a real event record?**


7. **Where does Perplexity add confident unverifiable specifics?**


---

**Checkpoint:** You can describe a clean event record in plain English and name the 3 most common ways raw data will be dirty.
