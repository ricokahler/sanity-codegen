import { boundedFind } from './bounded-find';

describe('boundedFind', () => {
  it("hi-jacks throws for better control flow inside of visitor patterns (e.g. babel's traverse)", () => {
    let finishedIterating = false;
    function traverse({ visitor }: { visitor: (i: number) => void }) {
      for (let i = 0; i < 10; i++) {
        visitor(i);
      }
      finishedIterating = true;
    }

    const found = boundedFind<boolean>((resolve) => {
      traverse({
        visitor(i) {
          if (i === 2) {
            resolve(true);
          }
        },
      });
    });

    expect(found).toBe(true);
    // `boundedFind` will early exit
    expect(finishedIterating).toBe(false);
  });

  it('returns null if resolve is never called', () => {
    let finishedIterating = false;
    function traverse({ visitor }: { visitor: (i: number) => void }) {
      for (let i = 0; i < 10; i++) {
        visitor(i);
      }
      finishedIterating = true;
    }

    const found = boundedFind<boolean>((resolve) => {
      traverse({
        visitor(i) {
          if (i === 11) {
            resolve(true);
          }
        },
      });
    });

    expect(found).toBe(null);
    expect(finishedIterating).toBe(true);
  });

  it('works with nested bounded finds', () => {
    function traverse({ visitor }: { visitor: (i: number) => void }) {
      for (let i = 0; i < 10; i++) {
        visitor(i);
      }
    }

    const found = boundedFind<boolean>((resolve) => {
      traverse({
        visitor() {
          boundedFind<boolean>(() => {
            traverse({
              visitor(i) {
                if (i === 2) {
                  resolve(true);
                }
              },
            });
          });
        },
      });
    });

    expect(found).toBe(true);
  });
});
