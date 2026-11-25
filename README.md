# Casa in Rete

**Due persone sole, una casa. E un infermiere che le conosce.**

Prototipo per l'hackathon «Long Life Hack» (challenge 1, «Welfare & Comunità: la comunità che previene»). Una persona anziana che vive sola in una casa troppo grande affitta una stanza a un coetaneo solo; un infermiere di zona segue la casa; i familiari restano informati, se la persona lo vuole. Il programma lo gestisce, senza commissioni, un Comune o un ente del Terzo settore.

> Required Notice: Copyright 2026 Team Casa in Rete

## Aprirlo

**Dal PC.** Doppio clic su `casa-in-rete-mockup.html`: è un file unico, senza server e senza connessione. Si entra con un account di prova della pagina d'accesso; la password di tutti è «prova». Aperto dal PC, lo stato della prova resta salvato nel browser; dal menu dell'account, «Ripristina i dati di prova» riporta tutto all'inizio.

**Online.** La stessa pagina è su <https://casa-in-rete.pages.dev>. Online non salva nulla: niente cookie, niente memoria nel browser, nessuna chiamata a server esterni.

## Che cosa mostra

**Quattro utenze più il parente.** Chi cerca casa, chi affitta la stanza (sempre una persona anziana, aiutata se serve da un familiare), l'infermiere di zona e chi alloggia. Il parente vede solo le parti che la persona sceglie (richieste, costi, visite; la salute è un consenso a parte) e non può agire al suo posto.

**La guida sotto il login.** Il servizio spiegato in cinque capitoli: il futuro nei dati (previsioni ISTAT), i sei passi, i vantaggi per ognuno con tre calcolatori, le regole, che cosa non è ancora provato. Ogni numero ha la sua fonte.

## Le regole della gara

**Non commerciale.** Nessuna commissione e nessuna vendita. Si paga direttamente: l'affitto e le spese a chi apre la casa, la quota mensile all'infermiere. L'app tiene solo un promemoria. Al posto di un catalogo a pagamento, «Servizi del territorio» dice chi offre un servizio e come chiederlo.

**Non diagnostica.** L'app informa, orienta, ricorda e collega. Non fa diagnosi, non stima il rischio individuale, non interpreta sintomi o parametri clinici e non suggerisce, confronta, dosa, modifica o sospende farmaci, integratori o vaccini. Il questionario d'ingresso non dà esiti: le risposte le legge l'infermiere, che valuta di persona e decide. Ogni dubbio va al medico di famiglia, al farmacista o ai servizi del SSN; **in emergenza si chiama il 112**.

**Dati sintetici.** Case, persone, affitti, infermieri, parenti, valutazioni e conti sono inventati. Le foto delle stanze sono generate con l'intelligenza artificiale e non mostrano case vere. Nessun dato sanitario reale.

**Senza marchi.** Lo stile è ispirato a un design system pubblico con licenza MIT; nessun logo, carattere o marchio di terzi.

## Come è fatto

**Un file solo.** `sorgenti/pagina.html` è lo scheletro, `sorgenti/stile.css` lo stile, `sorgenti/dati.js` i dati di prova (con le foto incorporate) e le regole, `sorgenti/app.js` la logica, in JavaScript senza librerie. Dopo una modifica si rifà il file unico con:

```bash
python3 sorgenti/costruisci.py
```

**Le regole di prova** sono in `REGOLE`, all'inizio di `sorgenti/dati.js`: al massimo 4 persone per casa, autonomia valutata dall'infermiere, quota dell'infermiere di 8 € per ogni giorno feriale e casa seguita (al massimo 10 case), 6 interventi al mese già compresi, 20 € dal settimo intervento del mese e nei festivi fuori da una terapia. Sono proposte da validare in un pilota, non tariffe reali.

**Che cosa non è.** Un prototipo per mostrare un'idea, non un dispositivo medico e non un servizio in funzione. Non va usato per decisioni sulla salute di nessuno.

## Licenza

[PolyForm Noncommercial License 1.0.0](LICENSE.md): si può usare, studiare e modificare per scopi non commerciali; la licenza ammette espressamente anche l'uso da parte di enti di beneficenza, scuole e università, enti pubblici di ricerca, organizzazioni per la salute o la sicurezza pubblica, enti per l'ambiente e istituzioni pubbliche. L'uso commerciale è escluso. Chi ne distribuisce una copia deve includere la licenza e la riga «Required Notice» qui sopra.

---

## In English

**Casa in Rete** is a prototype for the «Long Life Hack» hackathon: an older person living alone in a house that is too big rents a room to a peer who also lives alone; a local nurse follows the household; relatives stay informed only with the person's consent. It is non-commercial (no fees, no sales, direct payments), non-diagnostic (it informs, guides, reminds and connects; doctors, pharmacists and the national health service decide; in an emergency call 112), and every piece of data is synthetic. Open `casa-in-rete-mockup.html` in a browser; test accounts use the password «prova». Licensed under the PolyForm Noncommercial License 1.0.0.
