// Text of `zvc-helper.php`, the PHP counterpart of Zaux's ZVCHelper
// (getValue, renderNode) plus the partial resolver shipped with JS exports.
// `p` provides header, namespace, guard and helper names (see profile.js).
export function helpersTemplate(p) {
  const { getValue, spread, renderNode, resolvePartials } = p.helpers;
  return `${p.header(['Runtime helpers of the Zaux PHP export: PHP counterpart of ZVCHelper.', 'No framework dependency.'])}${p.namespace}
${p.guard('zaux_is_list', `function zaux_is_list(array $value)
{
    return $value === [] || array_keys($value) === range(0, count($value) - 1);
}`)}

${p.guard(getValue, `/**
 * ZVCHelper.getValue: exact key first, then a dot path. Missing values are null.
 */
function ${getValue}($data, $path)
{
    if (is_object($data)) {
        $data = (array) $data;
    }
    if (is_array($data) && array_key_exists($path, $data)) {
        return $data[$path];
    }
    $value = $data;
    foreach (explode('.', $path) as $key) {
        if (is_array($value) && array_key_exists($key, $value)) {
            $value = $value[$key];
        } elseif (is_object($value) && property_exists($value, $key)) {
            $value = $value->$key;
        } else {
            return null;
        }
    }
    return $value;
}`)}

${p.guard(spread, `/**
 * Whole-props binding ($spread): the object field is merged over the fallback props.
 */
function ${spread}($data, $path, $base = [])
{
    $base = (array) $base;
    $value = ${getValue}($data, $path);
    if (is_object($value)) {
        $value = (array) $value;
    }
    if (is_array($value) && $value !== [] && !zaux_is_list($value)) {
        $base = array_replace($base, $value);
    }
    return $base === [] ? ${p.emptyObject} : $base;
}`)}

${p.guard(resolvePartials, `/**
 * Replaces ZVP references (nodes named after a registered partial) with the
 * nodes the partial renders, wrapped in ComponentsRenderer like the JS export.
 */
function ${resolvePartials}($value, array $registry, array $params = [], $depth = 0)
{
    if ($depth > 200) {
        throw new \\RuntimeException('Zaux partial cycle');
    }
    if (!is_array($value)) {
        return $value;
    }
    $name = isset($value['name']) && is_string($value['name']) ? $value['name'] : null;
    $props = $value['props'] ?? null;
    if ($name !== null && isset($registry[$name]) && (is_array($props) || $props instanceof \\stdClass)) {
        $props = ${resolvePartials}((array) $props, $registry, $params, $depth + 1);
        $rendered = call_user_func($registry[$name], $props, $params);
        // Profiles returning JSON strings: partial results come back as arrays.
        if (is_string($rendered)) {
            $rendered = json_decode($rendered, true);
        }
        $rendered = is_array($rendered) && zaux_is_list($rendered) ? $rendered : [$rendered];
        $nodes = array_values(array_filter(${resolvePartials}($rendered, $registry, $params, $depth + 1)));
        return ['type' => 'component', 'name' => 'ComponentsRenderer', 'props' => ['components' => $nodes]];
    }
    $result = [];
    foreach ($value as $key => $item) {
        $result[$key] = ${resolvePartials}($item, $registry, $params, $depth + 1);
    }
    return $result;
}`)}

${p.guard(renderNode, `/**
 * ZVCHelper.renderNode: { ...meta, ...node }, with ZVP references resolved.
 */
function ${renderNode}(array $nodeObject, array $data = [], array $params = [], array $partials = [], $json = false)
{
    $node = array_replace($nodeObject['meta'] ?? [], (array) ($nodeObject['node'] ?? []));
    if ($partials) {
        $node = ${resolvePartials}($node, $partials, $params);
    }
    return $json ? json_encode($node, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : $node;
}`)}
`;
}
