/**
 * Paleta de colores nombrada, con tono medieval/fantasía.
 * Cada sprite se define con caracteres que mapean a estos colores.
 * "." (punto) y " " (espacio) significan transparente.
 */
export const PALETTE: Record<string, string> = {
  ".": "transparent",
  " ": "transparent",

  // Pasto y vegetación
  g: "#5a8f3a", // pasto base
  G: "#6fa84a", // pasto claro (motas)
  d: "#3f6b2a", // pasto oscuro
  o: "#2f5320", // verde muy oscuro (sombra de árbol)
  t: "#7bbf52", // hoja clara

  // Tierra / camino
  p: "#b08a52", // camino (tierra)
  P: "#c79c63", // camino claro
  m: "#8c6a3d", // tierra oscura
  k: "#5a4327", // marrón tronco

  // Agua
  w: "#3b76c4", // agua
  W: "#5a93d8", // agua brillo
  b: "#2a589a", // agua profunda

  // Piedra / muros
  s: "#8d8a85", // piedra
  S: "#a8a59f", // piedra clara
  x: "#5f5d59", // piedra oscura

  // Casas
  r: "#9c3b2e", // techo rojo
  R: "#b9543f", // techo claro
  e: "#caa978", // pared adobe
  E: "#ddc090", // pared clara
  n: "#4a2f1c", // madera puerta

  // Personajes
  f: "#e8c9a0", // piel
  h: "#5b3b1e", // pelo marrón
  H: "#caa15a", // pelo rubio / barba
  c: "#3f7d52", // túnica verde (héroe)
  C: "#2c5d3a", // túnica verde oscuro
  u: "#6b4ea8", // túnica anciano (violeta)
  U: "#503a80", // túnica anciano oscuro
  a: "#b8552f", // túnica aldeano (terракота)
  A: "#933f22", // túnica aldeano oscuro
  z: "#2b2b2b", // contorno / botas
  i: "#d8d2c4", // detalle claro (ojos/barba)

  // Objeto / reliquia
  y: "#f2d24b", // dorado
  Y: "#fff3a8", // dorado brillante
  q: "#bf9a2e", // dorado oscuro
} as const;
