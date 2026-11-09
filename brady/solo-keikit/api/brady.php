<?php
/**
 * Ponte del Capitano Brady (keik.it/brady.html → Anthropic API).
 *
 * La chiave API NON sta qui né su GitHub: sta nel file brady-config.php
 * nella cartella home di FastComet, fuori da public_html (vedi BRADY.md).
 * Le conversazioni non vengono salvate: il ponte tiene solo dei contatori
 * anonimi per limitare l'uso (impronta dell'IP, non l'IP).
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

date_default_timezone_set('Europe/Rome');

const IDS_PRENOTABILI = ['crispy', 'lingua', 'friendsgiving', 'panino', 'festa', 'tavolo'];

function rispondi(int $status, array $dati): void {
    http_response_code($status);
    echo json_encode($dati, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/* ---------- Configurazione ---------- */
function carica_config(): array {
    $candidati = array_filter([
        getenv('KEIK_BRADY_CONFIG') ?: null,
        isset($_SERVER['DOCUMENT_ROOT']) ? dirname(rtrim($_SERVER['DOCUMENT_ROOT'], '/')) . '/brady-config.php' : null,
        dirname(__DIR__, 2) . '/brady-config.php',
    ]);
    foreach ($candidati as $file) {
        if (is_readable($file)) {
            $cfg = require $file;
            if (is_array($cfg)) return $cfg;
        }
    }
    return [];
}

$cfg = carica_config();
$chiave = trim((string)($cfg['anthropic_api_key'] ?? ''));
if ($chiave === 'INCOLLA-QUI') $chiave = '';
$modello = (string)($cfg['model'] ?? 'claude-haiku-5-5');
$max_ip = (int)($cfg['max_messaggi_per_ip_10min'] ?? 20);
$max_giorno = (int)($cfg['max_messaggi_al_giorno'] ?? 1500);
$origini = $cfg['origini_ammesse'] ?? ['https://keik.it', 'https://www.keik.it'];
$api_url = (string)($cfg['api_url'] ?? 'https://api.anthropic.com/v1/messages');

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['stato'])) {
    rispondi(200, ['ok' => $chiave !== '', 'modello' => $chiave !== '' ? $modello : null]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') rispondi(405, ['ok' => false, 'error' => 'metodo']);
if ($chiave === '') rispondi(503, ['ok' => false, 'error' => 'non_configurato']);

$origine = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origine !== '' && !in_array($origine, $origini, true)) rispondi(403, ['ok' => false, 'error' => 'origine']);

/* ---------- Richiesta ---------- */
$grezzo = file_get_contents('php://input', false, null, 0, 24000);
$req = json_decode((string)$grezzo, true);
if (!is_array($req) || !isset($req['messages']) || !is_array($req['messages'])) rispondi(400, ['ok' => false, 'error' => 'richiesta']);

$messaggi = [];
foreach (array_slice($req['messages'], -12) as $m) {
    if (!is_array($m)) continue;
    $ruolo = ($m['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
    $testo = trim(mb_substr((string)($m['content'] ?? ''), 0, 800));
    if ($testo === '') continue;
    $n = count($messaggi);
    if ($n && $messaggi[$n - 1]['role'] === $ruolo) $messaggi[$n - 1]['content'] .= "\n\n" . $testo;
    else $messaggi[] = ['role' => $ruolo, 'content' => $testo];
}
while ($messaggi && $messaggi[0]['role'] !== 'user') array_shift($messaggi);
if (!$messaggi || end($messaggi)['role'] !== 'user') rispondi(400, ['ok' => false, 'error' => 'richiesta']);

/* ---------- Limiti d'uso (contatori anonimi) ---------- */
function contatore(string $nome, int $finestra, int $massimo): bool {
    $dir = sys_get_temp_dir() . '/keik-brady';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $file = $dir . '/' . $nome . '.json';
    $fh = @fopen($file, 'c+');
    if (!$fh) return true; // se non si può contare, non blocchiamo il cliente
    flock($fh, LOCK_EX);
    $adesso = time();
    $lista = json_decode((string)stream_get_contents($fh), true);
    $lista = array_values(array_filter(is_array($lista) ? $lista : [], fn($t) => is_int($t) && $t > $adesso - $finestra));
    $ok = count($lista) < $massimo;
    if ($ok) $lista[] = $adesso;
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($lista));
    flock($fh, LOCK_UN); fclose($fh);
    return $ok;
}
$impronta = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . $chiave), 0, 24);
if (!contatore('ip-' . $impronta, 600, $max_ip)) rispondi(429, ['ok' => false, 'error' => 'troppi_messaggi']);
if (!contatore('giorno-' . date('Ymd'), 86400, $max_giorno)) rispondi(429, ['ok' => false, 'error' => 'limite_giornaliero']);

/* ---------- Istruzioni per Brady, costruite dai dati del sito ---------- */
$base = dirname(__DIR__) . '/dati';
$eventi = json_decode((string)@file_get_contents($base . '/eventi.json'), true) ?: [];
$gusti = json_decode((string)@file_get_contents($base . '/privato/crispy-gusti.json'), true) ?: [];
$keik = (string)@file_get_contents($base . '/privato/brady-keik.txt');
$istruzioni = (string)@file_get_contents($base . '/privato/brady-istruzioni.txt');
if ($istruzioni === '' || !$eventi) rispondi(500, ['ok' => false, 'error' => 'dati']);

$GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
$MESI = ['', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
$data_it = function (string $iso) use ($GIORNI, $MESI): string {
    $t = strtotime($iso . ' 12:00');
    return $t ? $GIORNI[(int)date('w', $t)] . ' ' . (int)date('j', $t) . ' ' . $MESI[(int)date('n', $t)] : $iso;
};
$oggi = date('Y-m-d');
$adesso = $GIORNI[(int)date('w')] . ' ' . (int)date('j') . ' ' . $MESI[(int)date('n')] . ' ' . date('Y') . ', ore ' . date('H:i');

$righe = [];
foreach (($eventi['eventi'] ?? []) as $e) {
    $date = $e['date'] ?? [];
    $passato = $date && max($date) < $oggi;
    $r = '- ' . $e['titolo'] . ' [id: ' . $e['id'] . ']' . ($passato ? ' · GIÀ PARTITO' : '') . "\n";
    $r .= '  Quando: ' . $e['quando'] . ($date ? ' (' . implode(', ', array_map($data_it, $date)) . ')' : '') . "\n";
    if (!empty($e['stato'])) $r .= '  Stato: ' . $e['stato'] . "\n";
    $r .= '  ' . $e['descrizione'] . "\n";
    foreach (($e['dettagli'] ?? []) as $d) $r .= '  · ' . $d . "\n";
    $r .= '  Prenotazione: ' . (!empty($e['modulo']) ? 'con il modulo online (pulsante sulla carta d\'imbarco) oppure su WhatsApp' : 'non si prenota') . "\n";
    $righe[] = $r;
}
if (!empty($eventi['feste_private'])) {
    $f = $eventi['feste_private'];
    $righe[] = '- ' . $f['titolo'] . " [id: festa]\n  " . $f['descrizione'] . "\n  · " . implode("\n  · ", $f['dettagli'] ?? []) . "\n  Prenotazione: su WhatsApp\n";
}
$svelati = [];
foreach (($gusti['gusti'] ?? []) as $g) {
    if (strtotime($g['svelato_dal']) <= time()) $svelati[] = '- ' . $data_it($g['venerdi']) . ': ' . $g['gusto'] . ' (' . $g['descrizione'] . ')';
}

$sistema = strtr($istruzioni, [
    '{{MESE}}' => (string)($eventi['mese'] ?? ''),
    '{{DESTINAZIONE}}' => (string)($eventi['destinazione'] ?? ''),
    '{{ADESSO}}' => $adesso,
    '{{EVENTI}}' => implode("\n", $righe),
    '{{GUSTI}}' => $svelati ? implode("\n", $svelati) : 'Nessuno ancora: il prossimo si svela il mercoledì prima del venerdì, alle 10.',
    '{{KEIK}}' => $keik,
    '{{IDS}}' => implode('|', IDS_PRENOTABILI),
]);

// Lingua in cui sta scrivendo il cliente (la stima la pagina): indicazione esplicita, fuori dalla parte in cache
$lingue = ['it' => 'italiano', 'en' => 'inglese', 'es' => 'spagnolo', 'fr' => 'francese'];
$lingua = is_string($req['lang'] ?? null) && isset($lingue[$req['lang']]) ? $req['lang'] : null;
$nota_lingua = $lingua ? [['type' => 'text', 'text' => "LINGUA: l'ultimo messaggio del cliente sembra in " . $lingue[$lingua] . ". Se è così rispondi in " . $lingue[$lingua] . ", anche nel saluto di chiusura, con lang \"" . $lingua . "\"."]] : [];

/* ---------- Chiamata all'API ---------- */
$corpo = [
    'model' => $modello,
    'max_tokens' => 500,
    'system' => array_merge([['type' => 'text', 'text' => $sistema, 'cache_control' => ['type' => 'ephemeral']]], $nota_lingua),
    'messages' => $messaggi,
    'tools' => [[
        'name' => 'rispondi',
        'description' => 'Invia la risposta di Brady al cliente.',
        'input_schema' => [
            'type' => 'object',
            'properties' => [
                'reply' => ['type' => 'string', 'description' => 'Testo per il cliente'],
                'lang' => ['type' => 'string', 'enum' => ['it', 'en', 'es', 'fr']],
                'booking' => [
                    'type' => ['object', 'null'],
                    'properties' => [
                        'event' => ['type' => 'string', 'enum' => IDS_PRENOTABILI],
                        'date' => ['type' => ['string', 'null'], 'description' => 'AAAA-MM-GG, solo se detta dal cliente'],
                        'turno' => ['type' => ['string', 'null'], 'description' => 'HH:MM, solo se detto dal cliente'],
                        'persone' => ['type' => ['integer', 'null'], 'description' => 'Solo se detto dal cliente'],
                    ],
                    'required' => ['event'],
                ],
                'chips' => ['type' => 'array', 'items' => ['type' => 'string'], 'maxItems' => 3],
                'fine' => ['type' => 'boolean', 'description' => 'true solo per il saluto di chiusura'],
            ],
            'required' => ['reply', 'lang', 'booking'],
        ],
    ]],
    'tool_choice' => ['type' => 'tool', 'name' => 'rispondi'],
];
$ch = curl_init($api_url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 40,
    CURLOPT_HTTPHEADER => [
        'content-type: application/json',
        'x-api-key: ' . $chiave,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_POSTFIELDS => json_encode($corpo, JSON_UNESCAPED_UNICODE),
]);
$risposta = curl_exec($ch);
$codice = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($risposta === false || $codice < 200 || $codice >= 300) {
    error_log('Brady: errore API ' . $codice);
    rispondi(502, ['ok' => false, 'error' => $codice === 429 || $codice === 529 ? 'occupato' : 'api']);
}
$api = json_decode((string)$risposta, true);
$testo = '';
$json = null;
foreach (($api['content'] ?? []) as $blocco) {
    if (($blocco['type'] ?? '') === 'tool_use' && is_array($blocco['input'] ?? null)) $json = $blocco['input'];
    if (($blocco['type'] ?? '') === 'text') $testo .= $blocco['text'];
}

/* ---------- Lettura della risposta di Brady ---------- */
if (!is_array($json)) $json = json_decode(trim($testo), true);
if (!is_array($json)) {
    $a = strpos($testo, '{'); $b = strrpos($testo, '}');
    if ($a !== false && $b !== false && $b > $a) $json = json_decode(substr($testo, $a, $b - $a + 1), true);
}
if (!is_array($json) || !is_string($json['reply'] ?? null) || trim($json['reply']) === '') {
    $pulito = trim(preg_replace('/[{}]/', '', $testo));
    if ($pulito === '') rispondi(502, ['ok' => false, 'error' => 'vuoto']);
    $json = ['reply' => $pulito];
}

$booking = null;
if (is_array($json['booking'] ?? null) && in_array($json['booking']['event'] ?? '', IDS_PRENOTABILI, true)) {
    $b = $json['booking'];
    $booking = [
        'event' => $b['event'],
        'date' => is_string($b['date'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $b['date']) ? $b['date'] : null,
        'turno' => is_string($b['turno'] ?? null) && preg_match('/^\d{2}:\d{2}$/', $b['turno']) ? $b['turno'] : null,
        'persone' => is_numeric($b['persone'] ?? null) ? max(1, min(80, (int)$b['persone'])) : null,
    ];
}
$chips = [];
foreach ((is_array($json['chips'] ?? null) ? $json['chips'] : []) as $c) {
    if (is_string($c) && trim($c) !== '' && count($chips) < 3) $chips[] = mb_substr(trim($c), 0, 60);
}
$lang = in_array($json['lang'] ?? '', ['it', 'en', 'es', 'fr'], true) ? $json['lang'] : null;

rispondi(200, [
    'ok' => true,
    'reply' => mb_substr(trim($json['reply']), 0, 1500),
    'lang' => $lang,
    'booking' => $booking,
    'chips' => ($json['fine'] ?? false) === true ? [] : $chips,
    'fine' => ($json['fine'] ?? false) === true,
]);
