"""Unisce pagina, stile, dati e logica in un solo file HTML che si apre con un doppio clic."""
import pathlib, sys
qui = pathlib.Path(__file__).resolve().parent
pagina = (qui / "pagina.html").read_text(encoding="utf-8")
for segnaposto, nome in (("/*STILE*/", "stile.css"), ("/*DATI*/", "dati.js"), ("/*APP*/", "app.js")):
    pagina = pagina.replace(segnaposto, (qui / nome).read_text(encoding="utf-8"))
uscita = qui.parent / "casa-in-rete-mockup.html"
uscita.write_text(pagina, encoding="utf-8")
print(f"scritto {uscita.name}: {len(pagina.encode('utf-8')) // 1024} KB")
