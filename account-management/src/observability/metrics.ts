type Counter = { count: number; totalDurationMs: number };

const counters = new Map<string, Counter>();

export function recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number) {
  const key = `${method}|${route}|${statusCode}`;
  const current = counters.get(key) || { count: 0, totalDurationMs: 0 };
  current.count += 1;
  current.totalDurationMs += durationMs;
  counters.set(key, current);
}

export function renderMetrics() {
  const lines = [
    '# HELP pondok_http_requests_total Total HTTP requests handled by Account Management.',
    '# TYPE pondok_http_requests_total counter',
    '# HELP pondok_http_request_duration_ms_total Total HTTP request duration in milliseconds.',
    '# TYPE pondok_http_request_duration_ms_total counter',
  ];
  for (const [key, value] of counters) {
    const [method, route, status] = key.split('|');
    const labels = `method="${method}",route="${route}",status_code="${status}"`;
    lines.push(`pondok_http_requests_total{${labels}} ${value.count}`);
    lines.push(`pondok_http_request_duration_ms_total{${labels}} ${value.totalDurationMs}`);
  }
  return `${lines.join('\n')}\n`;
}
