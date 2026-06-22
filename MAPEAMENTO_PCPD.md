# Mapeamento de Tags do Template PCPD

## Atualizações de Extração PCPD (Junho/2026)

As seguintes melhorias foram implementadas na extração de dados de PCPDs, especialmente para o formato de PDF encontrado em `PCPD_Borba_123-26.pdf`.

### Problemas Resolvidos:
1. **CPF (Bug Crítico)**: CPFs extraídos de PDFs às vezes não tinham formatação (ex: `02578215979`). A extração agora formata automaticamente para o padrão `025.782.159-79`.
2. **Data de Nascimento (Bug Crítico)**: A extração falhava quando o label "Data Nascimento:" e o valor estavam em linhas separadas (comum em PDFs escaneados). Agora, a extração busca tanto na mesma linha quanto na linha seguinte ao label.
3. **GDH (Bug Médio)**: A extração de GDH agora aceita o mês com letras minúsculas (ex: `211000jun26` em vez de `211000JUN26`) e busca o padrão na linha seguinte ao label quando necessário.
4. **Telefone (Bug Médio)**: A extração de telefone agora aceita números sem DDD e separados por linhas, formatando-os corretamente (ex: `24981161636` -> `(24) 98116-1636`).
5. **Novos Campos**: Foram adicionadas extrações para o `Nº de dias`, o `Valor da tarifa de embarque`, a `Localidade de destino` e o `Nº da Nota de Crédito` (ex: `2026NC123456`), campos essenciais para a geração correta dos dados de missão.

### Detalhes Técnicos das Correções:

#### RegEx Cósmica para CPF
A expressão regular para CPF foi aprimorada com uma lógica de fallback:
- **Tentativa 1**: Captura CPFs já formatados (ex: `123.456.789-00`).
- **Tentativa 2**: Captura CPFs mistos (com espaços ou pontos parciais).
- **Tentativa 3**: Captura 11 dígitos consecutivos e os formata automaticamente.

#### Lógica de Fallback para Data Nascimento e GDH
Funções de extração modificadas para lidar com dados em linhas separadas. Agora, a extração não depende apenas de valores na mesma linha do label (ex: `Data Nascimento: 08/07/1980`), mas também verifica a linha seguinte ao label, capturando dados estruturados em PDFs ou OCRs.

#### Exemplos Práticos de Extração do PDF `PCPD_Borba_123-26.pdf`:
- **Nome**: `Adriano Martins Borba`
- **OM**: `Cmdo Bda Inf Amv`
- **Posto/Grad**: `Coronel` (mapeado de `Cel`)
- **CPF**: `025.782.159-79` (formatado a partir de `02578215979`)
- **Data Nascimento**: `08/07/1980` (resgatada da linha seguinte ao label)
- **Email**: `borba.adriano@eb.mil.br`
- **Telefone**: `(24) 98116-1636` (formatado a partir de `24981161636`)
- **GDH Ida**: `211000JUN26` (normalizado a partir de `211000jun26`)
- **Destino**: `Brasília-DF`
- **NC**: `2026NC123456`

## Legenda
- **Posição no documento**: onde a tag aparece no texto do template
- **Tag no template**: o placeholder `{{...}}` que está no documento
- **Campo do formulário**: o input HTML que alimenta a tag
- **Dado de teste**: valor preenchido pelo botão "Dados de Teste"

---

## Layout do PDF (`PCPD_Borba_123-26.pdf`)

Texto extraído do PDF real que serve como referência para os regex de extração:

```
MINISTÉRIO DA DEFESA
EXÉRCITO BRASILEIRO
COMANDO DA 2ª REGIÃO MILITAR
PROPOSTA DE CONCESSÃO DE PASSAGENS E DIÁRIAS
1. Proposta de concessão de passagens e diárias: nº 123/26
2. Beneficiário
( x ) Militar  ( ) Servidor Civil  ( ) Colaborador Eventual
Nome: Adriano Martins Borba
OM: Cmdo Bda Inf Amv
Posto/Grad: Cel
Data Nascimento:                                        ← PODE ESTAR NA LINHA SEGUINTE
08/07/1980                                               ← valor separado do label
CPF: 02578215979                                         ← SEM PONTOS E HÍFEN
Banco: Banco do Brasil
Agência: 3303-0
Conta Corrente: 33349-2
E-mail: borba.adriano@eb.mil.br
Telefone Fixo:
Telefone Celular:
24981161636                                              ← valor SEM PARÊNTESES DDD
3. Afastamento da sede: (Caçapava - SP x Brasília-DF x Caçapava- SP)
Ida (GDH): 211000jun26                                   ← MÊS MINÚSCULO
Volta (GDH): 211000jun26
BI que publicou a autorização para o afastamento: BI nr 123, de 01 de julho de 2026
4. Evento: Simpósio de Racionalização Administrativa
Início (GDH): 211000jun26
Término (GDH): 211000jun26
Quantidade de cidades previstas na missão: 1
5. Justificativa...
6. Diárias
Localidade de destino: Brasília-DF.
Nº de dias: 1
Nº de diárias: 1
Valor Total de diárias: R$ 1.000,00
Valor da tarifa de embarque e desembarque (SFC): R$ 95,00
Valor total a receber: R$ 1.000,00
7. Categoria de transporte: ( ) rodoviário ( x ) aéreo ...
9. Órgão cotista ... 2026NC123456
10. Local e data
Caçapava-SP, 22 de junho de 2026.
```

### Diferenças-chave entre layout PDF e DOCX

| Campo | DOCX (template) | PDF (extração) | Regex atualizado? |
|---|---|---|---|
| CPF | `123.456.789-00` (com pontos/hífen) | `02578215979` (só dígitos) | ✅ Agora suporta ambos |
| Data Nascimento | `15/05/1990` (mesma linha do label) | Label e valor em linhas separadas | ✅ Agora busca linha seguinte |
| GDH | `211000JUN26` (maiúsculo) | `211000jun26` (minúsculo) | ✅ `limparGDH` já uppercases |
| Telefone | `(12) 98765-4321` (com formatação) | `24981161636` (só números, linha separada) | ✅ Agora busca linha seguinte |
| Destino | dentro de Afastamento | campo separado `Localidade de destino:` | ✅ Novo regex |
| Nº dias | N/A | `Nº de dias: 1` | ✅ Novo regex |
| Valor tarifa | N/A | `R$ 95,00` | ✅ Novo regex |
| NC | N/A | `2026NC123456` | ✅ Novo regex |

---

## Tabela de Mapeamento — Tags do Template

| # | Posição no documento | Tag no template | Campo do formulário (name=) | Dado de teste | Status |
|---|---|---|---|---|---|
| 1 | "1. Proposta de concessão..." (título) | `{{nr pcpd}}` | `nr_pcpd` | `042/26` | ✅ |
| 2 | "Nome:" (seção Beneficiário) | `{{nome completo}}` | `nome_completo` | `JOSÉ DA SILVA OLIVEIRA` | ✅ |
| 3 | "OM:" | `{{OM}}` | `om` | `12º BIL Amv` | ✅ |
| 4 | "Posto/Grad:" | `{{posto/grad}}` | `posto_grad` | `Cap` | ✅ |
| 5 | "Data Nascimento:" | `{{data nascimento}}` | `data_nascimento` | `1990-05-15` | ✅ |
| 6 | "CPF:" | `{{cpf}}` | `cpf` | `123.456.789-00` | ✅ |
| 7 | "Banco:" | `{{banco}}` | `banco` | `Banco do Brasil` | ✅ |
| 8 | "Agência:" | `{{agencia}}` | `agencia` | `1234-5` | ✅ |
| 9 | "Conta Corrente:" | `{{conta}}` | `conta` | `98765-4` | ✅ |
| 10 | "E-mail:" | `{{email}}` | `email` | `silva.jose@eb.mil.br` | ✅ |
| 11 | "Telefone Fixo:" | `{{telefone}}` | `celular` (alias) | `(12) 98765-4321` | ⚠️ Mapeado para celular |
| 12 | "Telefone Celular:" | `{{celular}}` | `celular` | `(12) 98765-4321` | ✅ |
| 13 | "Afastamento da sede:" | `{{afastamento}}` | `afastamento` | `De Caçapava-SP para Resende-RJ` | ✅ |
| 14 | "Ida (GDH):" | `{{ida}}` | `ida` | `2026-06-20` | ✅ |
| 15 | "Volta (GDH):" | `{{volta}}` | `volta` | `2026-06-25` | ✅ |
| 16 | "BI que publicou..." | `{{bi}}` | `bi` | `BI nº 123 de 15 MAIO 26` | ✅ |
| 17 | "4. Evento:" | `{{evento}}` | `evento` | `Operação CORE 26` | ✅ |
| 18 | "Início (GDH):" | `{{inicio}}` | `inicio` | `2026-06-21` | ✅ |
| 19 | "Término (GDH):" | `{{termino}}` | `termino` | `2026-06-24` | ✅ |
| 20 | "Quantidade de cidades..." | `{{qtd cidades}}` | `qtd_cidades` | `1` | ⚠️ Tag não existe no template |
| 21 | "5. Justificativa" | `{{justificativa}}` | `justificativa` | `Participar do adestramento...` | ⚠️ Tag não existe no template |
| 22 | "Localidade de destino:" | `{{destino}}` | `destino` | `Resende-RJ` | ✅ |
| 23 | "Nº de dias:" | `{{nr dias}}` | `nr_dias` | `5` | ✅ |
| 24 | "Nº de diárias:" | `{{nr diaria}}` | `nr_diaria` | `5` | ✅ |
| 25 | "Valor Total de diárias:" | `{{valor}}` | `valor` | `1250.50` | ✅ |
| 26 | "Valor da tarifa..." | `{{valor tarifa}}` | `valor_tarifa` | `15.00` | ⚠️ Tag não existe no template |
| 27 | "Valor total a receber:" | `{{valor}}` | `valor` | `1250.50` | ⚠️ Mesma tag do #25 (duplicada) |
| 28 | "Autoridade requisitante" (assinatura) | `{{nome requisitante}}` | `nome_requisitante` | `MARCOS ANTONIO DE SOUZA` | ✅ |
| 29 | "Local e data" | `{{dia}}`, `{{mês}}`, `{{ano}}` | `dia`, `mês`, `ano` | `20`, `JUNHO`, `2026` | ⚠️ Tags não existem no template |

---

## Regex de Extração — Mapeamento PDF

| Campo | Regex | Formatos aceitos | Exemplo do PDF Borba |
|---|---|---|---|
| Nº Proposta | `n[º°]\s*(\d+/\S+)` | `123/26` | `123/26` |
| Nome | `N[oº]me:\s*(.+?)` + fallback linha seguinte | `Nome: X` ou `Nome:\nX` | `Adriano Martins Borba` |
| OM | `OM\s*[:;]\s*(.+?)` | `OM: X` | `Cmdo Bda Inf Amv` |
| Posto/Grad | `P[oº]st[oº]\/Gr[aª]d:\s*(.+?)` + mapeamento | `Cel`, `Cap`, etc. | `Cel` → `Coronel` |
| CPF | 3 tentativas: formatado, misto, só dígitos | `025.782.159-79` ou `02578215979` | `025.782.159-79` |
| Data Nasc. | `Data Nasciment[oa]:\s*(\d{2}/\d{2}/\d{4})` + fallback linha | mesma linha ou linha seguinte | `08/07/1980` |
| Email | `E[—-]\s*m[aª]il:\s*(email pattern)` + fallback | `E-mail: X` | `borba.adriano@eb.mil.br` |
| Telefone | `Telef[oº]ne Celul[aª]r:` + fallback linha | `(24) 98116-1636` ou `24981161636` | `(24) 98116-1636` |
| GDH | `LimparGDH` (uppercase) + fallback linha | `211000jun26` ou `211000JUN26` | `211000JUN26` |
| Destino | `Localidade\s*de\s*destino:\s*(.+)` | `Brasília-DF.` | `Brasília-DF` |
| Nº Diárias | `N[º°]?\s*de\s*di[áa]ri[ªa]s:\s*(\d+)` | `1` | `1` |
| Nº Dias | `N[º°]?\s*de\s*dias:\s*(\d+)` | `1` | `1` |
| Valor Diárias | `Valor\s*Total\s*de\s*di[áa]rias:\s*R\$\s*([\d.,]+)` | `1.000,00` | `1.000,00` |
| Tarifa | `tarifa\s*de\s*embarque[^:]*:\s*R\$\s*([\d.,]+)` | `95,00` | `95,00` |
| NC | `(\d{4}NC\d{6})` | `2026NC123456` | `2026NC123456` |
| Nome de Guerra | Último sobrenome do Nome | `BORBA` (de "Adriano Martins Borba") | `Borba` |
