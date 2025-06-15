#!/usr/bin/env python3
"""
TSA Code Duplication Detection Script
Prevents code duplication across backend services and infrastructure
"""
import os
import sys
import hashlib
import difflib
from pathlib import Path
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass
import ast
import re


@dataclass
class DuplicationIssue:
    """Represents a code duplication issue"""
    type: str  # 'exact', 'similar', 'pattern'
    severity: str  # 'high', 'medium', 'low'
    files: List[str]
    lines: List[Tuple[int, int]]  # (start, end) for each file
    description: str
    suggestion: str


class DuplicationDetector:
    """Detects various types of code duplication"""
    
    def __init__(self, root_dir: str = "/Users/gauntletai/Desktop/tsa"):
        self.root_dir = Path(root_dir)
        self.issues: List[DuplicationIssue] = []
        
        # Patterns that indicate duplication
        self.duplication_patterns = {
            # Table name patterns
            r'f"[\w-]+-v\d+-\{.*\}"': "Hardcoded table names - use shared configuration",
            r'table_name=f"[\w-]+-v\d+-\{.*\}"': "Hardcoded table names in CDK",
            r'os\.environ\.get\([\'"][\w_]+_TABLE[\'"]': "Direct table env access - use shared utils",
            
            # Lambda function patterns  
            r'lambda_\.Function\(\s*self,\s*[\'"][\w]+Handler[\'"]': "Similar Lambda definitions",
            r'function_name=f"tsa-[\w-]+-handler-': "Hardcoded function names",
            
            # DynamoDB patterns
            r'dynamodb\.Table\(.*table_name=': "Direct DynamoDB table creation",
            r'grant_read_write_data\(': "Repeated permission patterns",
            
            # API Gateway patterns
            r'add_resource\([\'"][\w-]+[\'"]': "Similar API resource patterns",
            r'add_method\([\'"]GET[\'"]': "Repeated API method patterns",
            
            # Environment variable patterns
            r'"DB_HOST":\s*self\.shared_resources\.get': "Repeated DB config",
            r'"USER_POOL_ID":\s*user_pool\.user_pool_id': "Repeated auth config",
        }
        
        # Files to analyze
        self.target_patterns = [
            "tsa-*-backend/**/*.py",
            "tsa-infrastructure/**/*.py",
        ]
        
        # Files to ignore
        self.ignore_patterns = [
            "__pycache__",
            ".git",
            "node_modules",
            "cdk.out",
            "venv",
            ".venv",
            "*.pyc",
            "test_*",
            "*_test.py"
        ]
    
    def should_ignore_file(self, file_path: Path) -> bool:
        """Check if file should be ignored"""
        path_str = str(file_path)
        return any(pattern in path_str for pattern in self.ignore_patterns)
    
    def get_python_files(self) -> List[Path]:
        """Get all Python files to analyze"""
        files = []
        for pattern in self.target_patterns:
            files.extend(self.root_dir.glob(pattern))
        
        return [f for f in files if f.is_file() and not self.should_ignore_file(f)]
    
    def detect_exact_duplicates(self, files: List[Path]) -> None:
        """Detect exact code duplicates using hashing"""
        file_hashes: Dict[str, List[Path]] = {}
        
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # Hash the content
                content_hash = hashlib.md5(content.encode()).hexdigest()
                
                if content_hash not in file_hashes:
                    file_hashes[content_hash] = []
                file_hashes[content_hash].append(file_path)
                
            except Exception as e:
                print(f"Warning: Could not read {file_path}: {e}")
        
        # Report duplicates
        for content_hash, file_list in file_hashes.items():
            if len(file_list) > 1:
                self.issues.append(DuplicationIssue(
                    type="exact",
                    severity="high",
                    files=[str(f) for f in file_list],
                    lines=[(1, -1)] * len(file_list),
                    description=f"Exact duplicate files found: {len(file_list)} files",
                    suggestion="Consolidate into shared module or remove duplicates"
                ))
    
    def detect_function_duplicates(self, files: List[Path]) -> None:
        """Detect duplicate function definitions"""
        function_signatures: Dict[str, List[Tuple[Path, int]]] = {}
        
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Parse AST to find function definitions
                try:
                    tree = ast.parse(content)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.FunctionDef):
                            # Create signature from function name and args
                            args = [arg.arg for arg in node.args.args]
                            signature = f"{node.name}({', '.join(args)})"
                            
                            if signature not in function_signatures:
                                function_signatures[signature] = []
                            function_signatures[signature].append((file_path, node.lineno))
                            
                except SyntaxError:
                    # Skip files with syntax errors
                    continue
                    
            except Exception as e:
                print(f"Warning: Could not analyze {file_path}: {e}")
        
        # Report duplicate function signatures
        for signature, locations in function_signatures.items():
            if len(locations) > 1:
                self.issues.append(DuplicationIssue(
                    type="similar",
                    severity="medium",
                    files=[str(loc[0]) for loc in locations],
                    lines=[(loc[1], loc[1]) for loc in locations],
                    description=f"Duplicate function signature: {signature}",
                    suggestion="Move to shared utility module"
                ))
    
    def detect_pattern_duplicates(self, files: List[Path]) -> None:
        """Detect duplication patterns using regex"""
        pattern_matches: Dict[str, List[Tuple[Path, int, str]]] = {}
        
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                for line_num, line in enumerate(lines, 1):
                    for pattern, description in self.duplication_patterns.items():
                        if re.search(pattern, line):
                            key = f"{pattern}:{description}"
                            if key not in pattern_matches:
                                pattern_matches[key] = []
                            pattern_matches[key].append((file_path, line_num, line.strip()))
                            
            except Exception as e:
                print(f"Warning: Could not analyze {file_path}: {e}")
        
        # Report pattern duplicates
        for key, matches in pattern_matches.items():
            if len(matches) > 2:  # Only report if pattern appears in multiple places
                pattern, description = key.split(":", 1)
                self.issues.append(DuplicationIssue(
                    type="pattern",
                    severity="medium",
                    files=[str(match[0]) for match in matches],
                    lines=[(match[1], match[1]) for match in matches],
                    description=f"Repeated pattern found {len(matches)} times: {description}",
                    suggestion="Use shared configuration or utility function"
                ))
    
    def detect_similar_blocks(self, files: List[Path], min_lines: int = 5) -> None:
        """Detect similar code blocks"""
        code_blocks: Dict[str, List[Tuple[Path, int, List[str]]]] = {}
        
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                # Extract blocks of code
                for i in range(len(lines) - min_lines + 1):
                    block = lines[i:i + min_lines]
                    # Normalize whitespace for comparison
                    normalized_block = [line.strip() for line in block if line.strip()]
                    
                    if len(normalized_block) >= min_lines:
                        block_hash = hashlib.md5('\n'.join(normalized_block).encode()).hexdigest()
                        
                        if block_hash not in code_blocks:
                            code_blocks[block_hash] = []
                        code_blocks[block_hash].append((file_path, i + 1, normalized_block))
                        
            except Exception as e:
                print(f"Warning: Could not analyze {file_path}: {e}")
        
        # Report similar blocks
        for block_hash, blocks in code_blocks.items():
            if len(blocks) > 1:
                # Check if blocks are actually similar (not just whitespace)
                first_block = blocks[0][2]
                if any(len(line) > 10 for line in first_block):  # Has substantial content
                    self.issues.append(DuplicationIssue(
                        type="similar",
                        severity="low",
                        files=[str(block[0]) for block in blocks],
                        lines=[(block[1], block[1] + len(block[2])) for block in blocks],
                        description=f"Similar code blocks found ({len(blocks)} instances)",
                        suggestion="Extract to shared function or utility"
                    ))
    
    def run_analysis(self) -> List[DuplicationIssue]:
        """Run complete duplication analysis"""
        print("🔍 TSA Code Duplication Analysis")
        print("=" * 50)
        
        # Get files to analyze
        files = self.get_python_files()
        print(f"Analyzing {len(files)} Python files...")
        
        # Run different types of analysis
        print("Detecting exact duplicates...")
        self.detect_exact_duplicates(files)
        
        print("Detecting function duplicates...")
        self.detect_function_duplicates(files)
        
        print("Detecting pattern duplicates...")
        self.detect_pattern_duplicates(files)
        
        print("Detecting similar code blocks...")
        self.detect_similar_blocks(files)
        
        return self.issues
    
    def generate_report(self) -> str:
        """Generate detailed duplication report"""
        if not self.issues:
            return "✅ No code duplication detected!"
        
        report = []
        report.append(f"🚨 Found {len(self.issues)} duplication issues:")
        report.append("=" * 60)
        
        # Group by severity
        high_issues = [i for i in self.issues if i.severity == "high"]
        medium_issues = [i for i in self.issues if i.severity == "medium"]
        low_issues = [i for i in self.issues if i.severity == "low"]
        
        for severity, issues in [("HIGH", high_issues), ("MEDIUM", medium_issues), ("LOW", low_issues)]:
            if issues:
                report.append(f"\n🔴 {severity} PRIORITY ({len(issues)} issues):")
                for i, issue in enumerate(issues, 1):
                    report.append(f"\n{i}. {issue.description}")
                    report.append(f"   Type: {issue.type}")
                    report.append(f"   Files: {len(issue.files)}")
                    for j, file_path in enumerate(issue.files):
                        lines = issue.lines[j] if j < len(issue.lines) else (0, 0)
                        report.append(f"     - {file_path} (lines {lines[0]}-{lines[1]})")
                    report.append(f"   💡 Suggestion: {issue.suggestion}")
        
        return "\n".join(report)


def main():
    """Main entry point"""
    detector = DuplicationDetector()
    issues = detector.run_analysis()
    
    report = detector.generate_report()
    print("\n" + report)
    
    # Exit with error code if high-priority issues found
    high_priority_count = len([i for i in issues if i.severity == "high"])
    if high_priority_count > 0:
        print(f"\n❌ Found {high_priority_count} high-priority duplication issues!")
        sys.exit(1)
    else:
        print("\n✅ No high-priority duplication issues found.")
        sys.exit(0)


if __name__ == "__main__":
    main() 