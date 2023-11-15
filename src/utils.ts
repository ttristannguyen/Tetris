export {RNG,attr}
/**
 * SOURCED FROM FIT2102 WEEK 4 TUTORIAL
 * A random number generator which provides two pure functions
 * `hash` and `scaleToRange`.  Call `hash` repeatedly to generate the
 * sequence of hashes.
 */
abstract class RNG {
  // LCG using GCC's constants
  private static m = 0x80000000; // 2**31
  private static a = 1103515245;
  private static c = 12345;

  /**
   * Call `hash` repeatedly to generate the sequence of hashes.
   * @param seed
   * @returns a hash of the seed
   */
  public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;

  /**
   * Takes hash value and scales it to the range [0, 6]
   */
  public static scale = (hash: number) => (7 * hash) / (RNG.m - 1);
}
const attr = (e: Element, o: { [p: string]: unknown}) => { for (const k in o) e.setAttribute(k,String(o[k]))}
