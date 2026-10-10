import { test, expect, type Locator } from '@playwright/test';

test('deep tree follows the active node and reference buttons retain keyboard focus', async ({
  page,
}) => {
  await page.goto('/chapters/11-binary-search-trees/');
  const lab = page.locator('[data-chapter-lab="bst"]');
  await load(
    lab,
    'search',
    Array.from({ length: 15 }, (_, i) => i + 1).join(','),
    '15',
  );
  for (let i = 0; i < 15; i++) await seekSource(lab, 'search.equal');
  await expect
    .poll(async () => {
      const canvas = (await lab.locator('[data-svg]').boundingBox())!;
      const active = (await lab.locator('.active-node').boundingBox())!;
      return (
        active.x >= canvas.x &&
        active.x + active.width <= canvas.x + canvas.width &&
        active.y >= canvas.y &&
        active.y + active.height <= canvas.y + canvas.height
      );
    })
    .toBe(true);
  const reference = lab.locator('.tree-state-strip [data-inspect]').first();
  await reference.focus();
  await reference.press('Enter');
  await expect(reference).toBeFocused();
  await expect(lab.locator('[data-inspector]')).toContainText('value1');
  await expect(lab.locator('.tree-state-strip')).toBeVisible();
  await expect(lab.locator('[data-svg] .tree-state-strip')).toHaveCount(0);
});

async function load(
  lab: Locator,
  operation: string,
  values: string,
  value: string,
) {
  await lab.locator('[name="preset"]').selectOption('custom');
  await lab.locator('[name="values"]').fill(values);
  await lab.locator('[name="value"]').fill(value);
  await lab.locator(`[data-operation="${operation}"]`).click();
  await expect(lab.locator('[data-input-error]')).toBeHidden();
}
async function seekSource(lab: Locator, source: string) {
  await lab
    .locator(`[data-code-region]:not([hidden]) [data-jump="${source}"]`)
    .click();
  await expect(
    lab.locator(`[data-code-region]:not([hidden]) [data-source="${source}"]`),
  ).toHaveClass(/executing/);
}

test('binary relationships: subtree selection, actual fields, memory identity and empty state', async ({
  page,
}) => {
  await page.goto('/chapters/10-binary-trees/');
  const preview = page.locator('[data-structure-preview="binary-tree"]');
  const node = preview.getByRole('button', { name: /Inspect B at/ });
  await node.focus();
  await node.press('Enter');
  await expect(preview.locator('.in-selected-subtree')).toHaveCount(3);
  const before = await preview
    .locator('[data-node]')
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('data-node')).sort(),
    );
  await expect(preview.locator('[data-inspector]')).toContainText('value66');
  await expect(preview.locator('[data-inspector] dt')).toHaveText([
    'value',
    'left',
    'right',
  ]);
  await preview.locator('[data-view="memory"]').click();
  expect(
    await preview
      .locator('[data-node]')
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute('data-node')).sort(),
      ),
  ).toEqual(before);
  await expect(preview.locator('[data-inspector]')).toContainText('value66');
  const lab = page.locator('[data-chapter-lab="binary-tree"]');
  await lab.locator('[name="preset"]').selectOption('empty');
  await expect(lab.locator('[data-node]')).toHaveCount(0);
  await expect(lab.locator('[data-svg]')).toContainText('Empty tree');
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-node]')).toHaveCount(1);
});

test('BST decisions are explicit, duplicate insertion is unchanged, and malformed inputs are rejected', async ({
  page,
}) => {
  await page.goto('/chapters/11-binary-search-trees/');
  const lab = page.locator('[data-chapter-lab="bst"]');
  await load(lab, 'search', '50,25,75,10,35,60,90,62', '62');
  const seen: string[] = [];
  for (let i = 0; i < 4; i++) {
    await seekSource(lab, 'search.equal');
    seen.push((await lab.locator('[data-step-explanation]').textContent())!);
  }
  expect(seen).toEqual([
    'Compare 62 == 50.',
    'Compare 62 == 75.',
    'Compare 62 == 60.',
    'Compare 62 == 62.',
  ]);
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('Found 62');
  await load(lab, 'insert', '50,25,75', '25');
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-node]')).toHaveCount(3);
  await expect(lab.locator('[data-ascii]')).toContainText('Duplicate rejected');
  await lab.locator('[name="values"]').fill('10,,20');
  await lab
    .locator('[data-operation-form]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(lab.locator('[data-input-error]')).toBeVisible();
});

for (const [values, value, kind] of [
  ['50,25,75', '25', 'leaf'],
  ['50,25,75,60,62', '60', 'one-child'],
  ['50,25,75,60,90,55,57', '50', 'two-child'],
])
  test(`BST ${kind} deletion exposes lifetime and exact successor rewiring`, async ({
    page,
  }) => {
    await page.goto('/chapters/13-tree-mutation/');
    const lab = page.locator('[data-chapter-lab="tree-mutation"]');
    await load(lab, 'erase', values!, value!);
    if (kind === 'two-child') {
      await seekSource(lab, 'erase.copy-value');
      await expect(lab.locator('[data-invariant-summary]')).toContainText(
        'temporary',
      );
      await expect(lab.locator('[data-svg] .freed')).toHaveCount(0);
      await seekSource(lab, 'erase.successor-bypass');
      await expect(lab.locator('[data-svg] .freed')).toHaveCount(0);
    }
    await lab.locator('[data-phase="after"]').click();
    await expect(lab.locator('[data-invariant-summary]')).toContainText(
      'All invariants valid',
    );
    const dead = lab.locator('[data-node].freed');
    await expect(dead).toHaveCount(1);
    await dead.focus();
    await dead.press('Enter');
    await expect(lab.locator('[data-inspector]')).toContainText(
      'No live object fields',
    );
    await expect(lab.locator('[data-inspector] dt')).toHaveCount(0);
  });

test('traversal stack frames and FIFO queue explain output order', async ({
  page,
}) => {
  await page.goto('/chapters/12-tree-traversal/');
  const lab = page.locator('[data-chapter-lab="traversal"]');
  await lab.locator('[data-operation="inorder"]').click();
  await seekSource(lab, 'dfs.emit-in');
  await expect(lab.locator('.tree-auxiliary')).toContainText('await left');
  await expect(lab.locator('.tree-output')).toContainText('D');
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('.tree-output')).toContainText('D → B → E → A → C');
  await lab.locator('[data-operation="bfs"]').click();
  await seekSource(lab, 'bfs.enqueue-right');
  await expect(lab.locator('.tree-auxiliary')).toContainText('B');
  await expect(lab.locator('.tree-auxiliary')).toContainText('C');
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('.tree-output')).toContainText('A → B → C → D → E');
});

test('foundation Break-It detects every controlled fault and restores validity', async ({
  page,
}) => {
  await page.goto('/chapters/11-binary-search-trees/');
  const root = page.locator('[data-foundation-break]');
  for (const fault of ['cycle', 'shared', 'lost', 'dead', 'order']) {
    await root.locator('[data-fault]').selectOption(fault);
    await root.locator('[data-break]').click();
    await expect(root.locator('.invariant-fail').first()).toBeVisible();
    await root.locator('[data-restore]').click();
    await expect(root.locator('.invariant-fail')).toHaveCount(0);
  }
});

test('all tree source dependencies are downloadable without exposing native fixtures', async ({
  request,
}) => {
  for (const [chapter, name] of [
    ['10', 'BinaryTree'],
    ['11', 'BinarySearchTree'],
    ['12', 'Traversal'],
    ['13', 'Mutation'],
    ['14', 'AvlTree'],
    ['15', 'RedBlackTree'],
    ['16', 'BTree'],
    ['16', 'BPlusTree'],
    ['17', 'Trie'],
  ]) {
    const response = await request.get(
      `/source/chapter-${chapter}/${name}.hpp`,
    );
    expect(response.ok()).toBe(true);
    const text = await response.text();
    expect(text).toContain('#pragma once');
    expect(text).not.toContain('@trace');
    expect(
      (await request.get(`/source/chapter-${chapter}/main.cpp`)).ok(),
    ).toBe(true);
  }
  expect((await request.get('/source/validation/trees.cpp')).status()).toBe(
    404,
  );
});

async function specialized(
  lab: Locator,
  operation: string,
  values: string,
  value: string,
) {
  await lab.locator('[name="values"]').fill(values);
  await lab.locator('[name="value"]').fill(value);
  await lab.locator(`[data-operation="${operation}"]`).click();
  await expect(lab.locator('[data-input-error]')).toBeHidden();
}
for (const [name, values, value, first, last] of [
  ['LL', '30,20', '10', 'right', 'right'],
  ['RR', '10,20', '30', 'left', 'left'],
  ['LR', '30,10', '20', 'left', 'right'],
  ['RL', '10,30', '20', 'right', 'left'],
])
  test(`AVL ${name}: source exposes transfer, link edits and height repair`, async ({
    page,
  }) => {
    await page.goto('/chapters/14-avl-trees/');
    const lab = page.locator('#avl-lab');
    await specialized(lab, 'insert', values!, value!);
    await seekSource(lab, `avl.${first}.transfer`);
    await expect(lab.locator('.tree-state-strip')).toContainText('transfer');
    await seekSource(lab, `avl.${first}.detach`);
    await expect(lab.locator('[data-invariant-summary]')).toContainText(
      'temporary',
    );
    await seekSource(lab, `avl.${last}.new-height`);
    await lab.locator('[data-phase="after"]').click();
    await expect(lab.locator('[data-invariant-summary]')).toContainText(
      'All invariants valid',
    );
    const root = await lab.locator('svg').getAttribute('data-tree-root');
    await expect(lab.locator(`[data-node="${root}"] .node-value`)).toHaveText(
      '20',
    );
    await expect(lab.locator('.tree-state-strip')).not.toContainText(
      'transfer',
    );
  });

test('red-black: parent/uncle/grandparent, recolor, rotation and explicit colors', async ({
  page,
}) => {
  await page.goto('/chapters/15-red-black-trees/');
  const lab = page.locator('#red-black-lab');
  await specialized(lab, 'insert', '20,10,30', '5');
  await seekSource(lab, 'rb.fix.uncle');
  await expect(lab.locator('.tree-state-strip')).toContainText('P');
  await expect(lab.locator('.tree-state-strip')).toContainText('U');
  await expect(lab.locator('.tree-state-strip')).toContainText('G');
  await seekSource(lab, 'rb.fix.uncle-black');
  await expect(lab.locator('[data-step-title]')).toContainText('black');
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-invariant-summary]')).toContainText(
    'All invariants valid',
  );
  await specialized(lab, 'insert', '30,20', '10');
  await seekSource(lab, 'rb.rotate.old-parent');
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-invariant-summary]')).toContainText(
    'All invariants valid',
  );
  expect(await lab.locator('[data-node].tree-black').count()).toBeGreaterThan(
    0,
  );
  const n = lab.locator('[data-node]').first();
  await n.focus();
  await n.press('Enter');
  await expect(lab.locator('[data-inspector]')).toContainText('parent');
  await expect(lab.locator('[data-inspector]')).toContainText('color');
});

test('wide pages: B-tree median moves, B+ separator is copied, leaf range follows links', async ({
  page,
}) => {
  await page.goto('/chapters/16-b-trees/');
  const tree = page.locator('#btree-lab'),
    plus = page.locator('#bplus-lab');
  await specialized(tree, 'insert', '10,20,30', '40');
  await seekSource(tree, 'bt.split.promote');
  await expect(tree.locator('[data-step-title]')).toContainText('median');
  await tree.locator('[data-phase="after"]').click();
  await expect(tree.locator('[data-invariant-summary]')).toContainText(
    'All invariants valid',
  );
  await specialized(plus, 'insert', '10,20,30', '40');
  await seekSource(plus, 'bp.split.promote');
  await expect(plus.locator('[data-step-title]')).toContainText('separator');
  await plus.locator('[data-phase="after"]').click();
  await expect(plus.locator('[data-invariant-summary]')).toContainText(
    'All invariants valid',
  );
  await plus.locator('[name="high"]').fill('50');
  await specialized(plus, 'range', '5,10,20,25,30,40,50,60', '15');
  await seekSource(plus, 'bp.range.next');
  await expect(
    plus.locator('[data-svg] [data-field="next"]').first(),
  ).toBeVisible();
  await plus.locator('[data-phase="after"]').click();
  await expect(plus.locator('.tree-output')).toContainText(
    '20 → 25 → 30 → 40 → 50',
  );
});

test('trie: path presence differs from terminal membership, pruning preserves longer words', async ({
  page,
}) => {
  await page.goto('/chapters/17-tries/');
  const lab = page.locator('#trie-lab');
  await lab.locator('[name="word"]').fill('ca');
  await lab.locator('[data-operation="search"]').click();
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('Word not found');
  await lab.locator('[data-operation="prefix"]').click();
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('[data-ascii]')).toContainText('Prefix exists');
  await lab.locator('[name="word"]').fill('car');
  await lab.locator('[data-operation="erase"]').click();
  await seekSource(lab, 'trie.erase.unmark');
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator('.tree-output')).toHaveText(
    'Outputcare → cat → dog',
  );
  await expect(lab.locator('[data-invariant-summary]')).toContainText(
    'All invariants valid',
  );
  await lab.locator('[name="words"]').fill('cat,CAPS');
  await lab
    .locator('[data-operation-form]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(lab.locator('[data-input-error]')).toBeVisible();
});

test('tree complexity explorers change path evidence with inputs', async ({
  page,
}) => {
  await page.goto('/chapters/11-binary-search-trees/');
  const explorer = page.locator('[data-tree-complexity]');
  await explorer.locator('[data-tree-size]').fill('63');
  await expect(explorer.locator('[data-tree-work]')).toContainText(
    '6 visited nodes',
  );
  await explorer.locator('[data-tree-shape]').selectOption('skewed');
  await expect(explorer.locator('[data-tree-work]')).toContainText(
    '63 visited nodes',
  );
  await page.goto('/chapters/17-tries/');
  const trie = page.locator('[data-tree-complexity]');
  await trie.locator('[data-tree-word]').fill('cat');
  await expect(trie.locator('[data-tree-work]')).toContainText(
    '3 character transitions',
  );
  await trie.locator('[data-tree-size]').fill('1024');
  await expect(trie.locator('[data-tree-work]')).toContainText(
    '3 character transitions',
  );
});

test('RB Break-It exposes root, red adjacency, black height and parent faults', async ({
  page,
}) => {
  await page.goto('/chapters/15-red-black-trees/');
  const root = page.locator('[data-rb-break]');
  for (const fault of ['root', 'red-red', 'black-height', 'parent']) {
    await root.locator('[data-fault]').selectOption(fault);
    await root.locator('[data-break]').click();
    await expect(root.locator('.invariant-fail').first()).toBeVisible();
    await root.locator('[data-restore]').click();
    await expect(root.locator('.invariant-fail')).toHaveCount(0);
  }
});
