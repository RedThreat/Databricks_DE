# Databricks Data Engineer Associate: site de estudo

Site estático (GitHub Pages) para preparar o exame **Databricks Certified Data Engineer Associate** (versão de 4 de maio de 2026, 7 secções). Exame marcado para **11 de dezembro de 2026**.

## O que tem

| Página | Conteúdo |
| --- | --- |
| Início | Formato do exame, pesos das 7 secções, contagem decrescente |
| Plano dia a dia | 23 nov → 11 dez, com checkboxes guardadas no browser |
| Matéria por secção | Resumo das 7 secções com tabelas, código, notas do Notion e links para as páginas de cada tópico |
| Armadilhas | Palavras-chave → resposta e erros frequentes |
| Flashcards | 95 cartões por secção (teclado: ← → espaço) |
| Labs | Exercícios para o Databricks Free Edition |
| Simulados | Mock 1, 2 e 3 (banco do site), o Simulado Associate (52 perguntas do ficheiro HTML), Sprint 75 min, treino por secção, revisão das falhadas, histórico |
| Recursos | Vídeos, CertSafari, Notion (Associate e Professional), exam guide, docs |
| Professional | Pesos e tópicos das 9 secções do exame de out 2026, links para o Notion e o Simulado Professional (80 perguntas) |
| Dia do exame | Checklist de preparação e regras de vigilância |

Há 267 perguntas: 135 do banco do site, 52 do Simulado Associate e 80 do Simulado Professional. Nenhuma é do exame real. As dos simulados têm a explicação de cada alternativa e algumas pedem duas respostas. O progresso e o histórico ficam guardados no `localStorage` do browser.

## Estrutura

```
index.html          páginas (navegação por #hash)
assets/style.css    estilos (tema claro/escuro automático)
assets/app.js       navegação, plano, flashcards, motor dos simulados
assets/questions.js        banco do site (Mock 1, 2 e 3)
assets/questions_extra.js  perguntas dos dois simulados HTML (formato com explicação por alternativa)
assets/data.js      plano, flashcards, links do Notion e estrutura do Professional
```

Para acrescentar uma pergunta, junta um objeto a `assets/questions.js`:

```js
{m:1, s:2, q:"Pergunta…", o:["A","B","C","D"], a:1, e:"Explicação"}
// m = mock (1|2), s = secção (1..7), a = índice da resposta certa (começa em 0), code = excerto opcional
```

## Publicar

Settings → Pages → Source: *Deploy from a branch* → `main` / root. O site fica em `https://<utilizador>.github.io/<repo>/`.
