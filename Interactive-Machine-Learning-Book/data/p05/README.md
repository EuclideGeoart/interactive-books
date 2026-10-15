All observations are explicit unitless synthetic teaching data, not seeded measurements.
The executable fixture specification is the `input` field of each case in
`fixtures/p05/clustering.json`; literal `expected` fields were authored independently.
The density fixture uses dyadic coordinates to make closed-boundary membership exact.
The Stage uses decimal [0,.1,.2,.3,.6,2], ε=.31, avoiding its boundary; the oracle also
checks those actual Stage values. Seeds select initial observation IDs only.
