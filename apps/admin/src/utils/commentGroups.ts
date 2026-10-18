export interface CommentGroup {
    label: string;
    count: number;
    share: number;
}

/** Group written comments that differ only by case, a small typo, or a short extra ending. */
export function groupComments(comments: Array<{ text: string }>): CommentGroup[] {
    const rows = comments
        .map((comment, index) => ({
            index,
            text: comment.text.trim(),
            key: compareKey(comment.text),
        }))
        .filter((row) => row.text.length > 0);
    if (rows.length === 0) return [];

    const parent = rows.map((_, index) => index);
    const find = (index: number): number => {
        let current = index;
        while (parent[current] !== current) current = parent[current];
        return current;
    };
    const unite = (left: number, right: number): void => {
        const a = find(left);
        const b = find(right);
        if (a !== b) parent[b] = a;
    };

    for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
            if (closeEnough(rows[i].key, rows[j].key)) unite(i, j);
        }
    }

    const clusters = new Map<number, typeof rows>();
    for (let i = 0; i < rows.length; i++) {
        const root = find(i);
        const list = clusters.get(root) ?? [];
        list.push(rows[i]);
        clusters.set(root, list);
    }

    const total = rows.length;
    const groups = [...clusters.values()].map((cluster) => ({
        label: clusterLabel(cluster),
        count: cluster.length,
        share: Math.round((cluster.length / total) * 100),
    }));
    groups.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    return groups;
}

function compareKey(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^(?:a|an|the)\s+/, "");
}

function closeEnough(left: string, right: string): boolean {
    if (!left || !right) return left === right;
    if (left === right) return true;
    const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
    if (shorter.length >= 4 && longer.startsWith(shorter) && longer.length - shorter.length <= 3) return true;
    if (shorter.length < 4) return false;
    const limit = shorter.length >= 6 ? 2 : 1;
    if (longer.length - shorter.length > limit) return false;
    const distance = levenshtein(left, right, limit);
    return distance <= limit && distance / longer.length <= 0.34;
}

function levenshtein(left: string, right: string, limit: number): number {
    if (Math.abs(left.length - right.length) > limit) return limit + 1;
    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i++) {
        const current = [i];
        let rowMin = i;
        for (let j = 1; j <= right.length; j++) {
            const cost = left[i - 1] === right[j - 1] ? 0 : 1;
            const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
            current[j] = value;
            if (value < rowMin) rowMin = value;
        }
        if (rowMin > limit) return limit + 1;
        previous = current;
    }
    return previous[right.length];
}

function clusterLabel(cluster: Array<{ index: number; text: string; key: string }>): string {
    const counts = new Map<string, { text: string; count: number; index: number }>();
    for (const row of cluster) {
        const existing = counts.get(row.text.toLowerCase());
        if (existing) {
            existing.count += 1;
            if (row.index < existing.index) existing.index = row.index;
        } else {
            counts.set(row.text.toLowerCase(), { text: row.text, count: 1, index: row.index });
        }
    }
    const variants = [...counts.values()].sort((a, b) => b.count - a.count || a.index - b.index);
    return variants[0]?.text ?? cluster[0].text;
}
