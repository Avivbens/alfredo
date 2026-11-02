import { matches } from 'fast-alfred';
import { basename } from 'node:path';
import type { LocalStack, Worktree } from '@alfredo/git-worktrees';
import { pluralize, toMemberGlyph } from '../common/text.util';
import type { CheckoutEntry, StackHeaderEntry } from '../models/checkout-entry.model';

type CheckoutRow = Extract<CheckoutEntry, { kind: 'checkout' }>;

type StackRow = CheckoutRow & Required<Pick<CheckoutRow, 'layer'>>;

type StackLabel = { title: string; label: string };

type CheckoutGroup = { rows: CheckoutRow[]; stack?: { header: StackHeaderEntry; label: string } };

function findStack(stacks: LocalStack[], { branch }: Worktree): LocalStack | undefined {
  return stacks.find(({ branches }) => branches.some((layer) => layer.branch === branch));
}

function toStackRow(checkout: Worktree, { branches }: LocalStack): StackRow {
  const index = branches.findIndex(({ branch }) => branch === checkout.branch);

  return {
    kind: 'checkout',
    checkout,
    layer: { position: index + 1, size: branches.length, prNumber: branches[index]?.prNumber },
  };
}

function byPosition(a: StackRow, b: StackRow): number {
  return a.layer.position - b.layer.position;
}

function toStackName([first]: StackRow[]): string {
  const folder = first ? basename(first.checkout.path) : '';

  const at = folder.lastIndexOf('@');

  return folder.slice(at + 1);
}

function toStackLabel({ number }: LocalStack, rows: StackRow[]): StackLabel {
  if (number === undefined) {
    const name = toStackName(rows);

    return { title: `Stack · ${name}`, label: `stack ${name}` };
  }

  const worktrees = pluralize(rows.length, 'worktree');

  return { title: `Stack ${number} · ${worktrees}`, label: `stack ${number}` };
}

function toStackGroup(stack: LocalStack, checkouts: Worktree[]): CheckoutGroup {
  const rows = checkouts.map((checkout) => toStackRow(checkout, stack)).toSorted(byPosition);
  const subtitle = `${rows.length} of ${pluralize(stack.branches.length, 'layer')} checked out`;
  const { title, label } = toStackLabel(stack, rows);

  return { rows, stack: { header: { kind: 'stack-header', title, subtitle }, label } };
}

function toSingleGroup(checkout: Worktree): CheckoutGroup {
  return { rows: [{ kind: 'checkout', checkout }] };
}

/** The main checkout is the repo itself, so it leads the list and never joins a stack's group. */
function toCheckoutGroups([main, ...linked]: Worktree[], stacks: LocalStack[]): CheckoutGroup[] {
  if (!main) {
    return [];
  }
  const stackOf = linked.map((checkout) => findStack(stacks, checkout));
  const linkedGroups = linked.flatMap((checkout, index): CheckoutGroup[] => {
    const stack = stackOf[index];
    if (!stack) {
      const single = toSingleGroup(checkout);

      return [single];
    }
    if (stackOf.indexOf(stack) !== index) {
      return [];
    }
    const members = linked.filter((_, other) => stackOf[other] === stack);
    const group = toStackGroup(stack, members);

    return [group];
  });

  const mainGroup = toSingleGroup(main);

  return [mainGroup, ...linkedGroups];
}

function toSearchText({ checkout }: CheckoutRow, label?: string): string {
  const text = `${basename(checkout.path)} ${checkout.branch}`;

  return label ? `${text} ${label}` : text;
}

function toGroupEntries({ rows, stack }: CheckoutGroup, filter: string): CheckoutEntry[] {
  const shown = matches(filter, rows, (row) => toSearchText(row, stack?.label));
  if (!stack || !shown.length) {
    return shown;
  }

  const members = shown.map((row, index) => ({ ...row, glyph: toMemberGlyph(index, shown.length) }));

  return [stack.header, ...members];
}

/** Groups form before the filter applies, so typing narrows a stack's rows but never rewrites its header. */
export function toCheckoutEntries(checkouts: Worktree[], stacks: LocalStack[], filter = ''): CheckoutEntry[] {
  const groups = toCheckoutGroups(checkouts, stacks);

  return groups.flatMap((group) => toGroupEntries(group, filter));
}
