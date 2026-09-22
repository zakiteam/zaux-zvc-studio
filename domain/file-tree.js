// Builds a folder/file tree from the flat relative paths of an export package.
// Kept pure so folder grouping, sorting and search filtering stay deterministic
// and independent of any Vue component.

function compareNames(left, right) {
	return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}

function sortNodes(nodes) {
	nodes.sort((left, right) =>
		left.type === right.type ? compareNames(left, right) : left.type === 'folder' ? -1 : 1,
	);
	nodes.forEach((node) => {
		if (node.type === 'folder') sortNodes(node.children);
	});
	return nodes;
}

// Turns ['a/b.js', 'a/c.js', 'README.md'] into nested { name, path, type, children } nodes.
export function buildFileTree(paths) {
	const root = { name: '', path: '', type: 'folder', children: [] };
	for (const path of paths) {
		const parts = path.split('/');
		let node = root;
		let current = '';
		for (let index = 0; index < parts.length; index++) {
			const part = parts[index];
			current = current ? `${current}/${part}` : part;
			const isLeaf = index === parts.length - 1;
			if (isLeaf) {
				node.children.push({ name: part, path, type: 'file' });
			} else {
				let child = node.children.find((item) => item.type === 'folder' && item.name === part);
				if (!child) {
					child = { name: part, path: current, type: 'folder', children: [] };
					node.children.push(child);
				}
				node = child;
			}
		}
	}
	return sortNodes(root.children);
}

// Keeps files whose name/path match the query and any folder that still contains
// matches. A folder whose own name matches keeps all of its children.
export function filterFileTree(nodes, query) {
	const needle = String(query ?? '').trim().toLowerCase();
	if (!needle) return nodes;
	const result = [];
	for (const node of nodes) {
		if (node.type === 'file') {
			if (node.name.toLowerCase().includes(needle) || node.path.toLowerCase().includes(needle)) result.push(node);
		} else {
			const folderMatches = node.name.toLowerCase().includes(needle) || node.path.toLowerCase().includes(needle);
			const children = filterFileTree(node.children, query);
			if (folderMatches) result.push({ ...node, children: node.children });
			else if (children.length) result.push({ ...node, children });
		}
	}
	return result;
}

export function countFiles(nodes) {
	return nodes.reduce((total, node) => total + (node.type === 'file' ? 1 : countFiles(node.children)), 0);
}
