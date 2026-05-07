import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, FileUp, CheckCircle, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import API from "@/api";
import { toast } from "sonner";
import { downloadTemplate } from "@/utils/exportHelper";

const templates = {
    students: {
        name: "Students Template",
        headers: ["name", "email", "password", "phone", "admission_no", "blood_group", "gender", "grade", "class", "roll_no", "admission_date", "date_of_birth", "academic_year", "address", "adhar_no", "fathers_name", "mothers_name", "father_occupation", "mother_contect", "parent_contact"],
        mandatory: ["name", "email", "password", "gender", "grade", "class", "roll_no", "admission_date", "academic_year"],
        fileName: "students_bulk_template"
    },
    teachers: {
        name: "Teachers Template",
        headers: ["name", "email", "password", "phone", "gender", "employee_code", "hire_date", "qualification", "address", "adhar_no", "bio"],
        mandatory: ["name", "email", "password", "phone", "gender", "hire_date", "qualification", "adhar_no"],
        fileName: "teachers_bulk_template"
    },
    staff: {
        name: "Staff Template",
        headers: ["name", "email", "password", "sub_role", "phone", "gender", "employee_code", "department", "hire_date", "address", "adhar_no"],
        mandatory: ["name", "email", "password", "sub_role", "phone", "gender", "department", "hire_date", "adhar_no"],
        fileName: "staff_bulk_template"
    }
};

export default function BulkImport({ defaultType = "students", disableTypeSelect = false, onImportComplete }) {
    const [importType, setImportType] = useState(defaultType);
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [metaData, setMetaData] = useState({
        grades: [],
        classes: [],
        academicYears: [],
        genders: ["male", "female", "other"]
    });

    useEffect(() => {
        const fetchMetaData = async () => {
            try {
                const [gradesRes, classesRes, ayRes] = await Promise.all([
                    API.get("/admin/get/grades"),
                    API.get("/admin/get/classes"),
                    API.get("/admin/get/academic-years")
                ]);
                setMetaData({
                    grades: (gradesRes.data.grades || []).map(g => g.name).filter(Boolean),
                    classes: (classesRes.data.classes || []).map(c => c.name).filter(Boolean),
                    academicYears: (ayRes.data.academic_years || []).map(ay => ay.name).filter(Boolean),
                    genders: ["male", "female", "other"]
                });
            } catch (err) {
                console.error("Failed to fetch meta data for bulk import", err);
            }
        };
        fetchMetaData();
    }, []);

    const handleDownloadTemplate = async () => {
        const config = templates[importType];
        const dropdowns = {
            grade: metaData.grades,
            class: metaData.classes,
            academic_year: metaData.academicYears,
            gender: metaData.genders
        };

        try {
            await downloadTemplate(config.headers, config.fileName, dropdowns, config.mandatory);
            toast.success("Template downloaded with dropdowns!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate template");
        }
    };

    const handleFileUpload = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setResults(null);
        setUploadProgress(0);
    };

    const handleProcessImport = async () => {
        if (!file) {
            toast.error("Please select a file first");
            return;
        }

        setIsUploading(true);
        setResults(null);
        setUploadProgress(0);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await API.post(`/bulk/${importType}`, formData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            setResults(res.data.results);

            if (res.data.results?.failed > 0) {
                if (res.data.results.success > 0) {
                    toast.warning(res.data.message || "Import completed with some errors");
                } else {
                    toast.error(res.data.message || "Import failed completely");
                }
            } else {
                toast.success(res.data.message || "Bulk import completed successfully!");
            }

            if (onImportComplete && res.data.results?.success > 0) {
                onImportComplete();
            }
            setFile(null);
        } catch (err) {
            toast.error(err.response?.data?.error || "Import failed");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-700 to-blue-800 p-8 shadow-xl text-white">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                <h1 className="text-3xl font-bold tracking-tight">Bulk Data Management</h1>
                <p className="mt-2 text-indigo-100 max-w-xl">
                    Effortlessly add multiple records at once using Excel templates. Perfect for start-of-term enrollments or staff onboarding.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Step 1: Get Template */}
                <Card className="border-0 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5 text-indigo-600" />
                            Step 1: Get Template
                        </CardTitle>
                        <CardDescription>
                            Select the type of data you want to import and download the Excel template.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Data Type</label>
                            <Select
                                value={importType}
                                onValueChange={setImportType}
                                disabled={disableTypeSelect}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select import type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="students">Students</SelectItem>
                                    <SelectItem value="teachers">Teachers</SelectItem>
                                    <SelectItem value="staff">Staff Members</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 border-indigo-200"
                            variant="outline"
                            onClick={handleDownloadTemplate}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download Template (Excel)
                        </Button>
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/30">
                            <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                                <strong>Important:</strong> Fill in the Excel file without changing the headers.
                                <br />
                                • Fields like <strong>Grade, Class, Gender, and Academic Year</strong> have dropdowns.
                                <br />
                                • Use <strong>YYYY-MM-DD</strong> format for all date columns (e.g., 2024-03-20).
                                <br />
                                • Ensure all required fields are filled to avoid errors.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 2: Upload */}
                <Card className="border-0 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-green-600" />
                            Step 2: Upload & Import
                        </CardTitle>
                        <CardDescription>
                            Upload your completed Excel file to process the bulk creation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${file ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 dark:bg-gray-800/20'}`}
                            onClick={() => document.getElementById('bulk-file-input').click()}
                        >
                            <input
                                id="bulk-file-input"
                                type="file"
                                className="hidden"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                            />
                            <FileUp className={`h-10 w-10 mx-auto mb-3 ${file ? 'text-green-500' : 'text-gray-400'}`} />
                            {file ? (
                                <div>
                                    <p className="font-medium text-green-700 dark:text-green-400">{file.name}</p>
                                    <p className="text-xs text-green-600 mt-1">Ready to import</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium">Click or drag and drop to upload</p>
                                    <p className="text-xs text-gray-500 mt-1">Excel files (.xlsx) only</p>
                                </div>
                            )}
                        </div>

                        <Button
                            className="w-full"
                            disabled={!file || isUploading}
                            onClick={handleProcessImport}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {uploadProgress < 100 ? `Uploading (${uploadProgress}%)` : "Processing Records..."}
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Process Bulk Creation
                                </>
                            )}
                        </Button>

                        {isUploading && (
                            <div className="mt-4 animate-in fade-in duration-300">
                                <div className="flex justify-between text-xs font-medium mb-1.5">
                                    <span className="text-indigo-600 dark:text-indigo-400">
                                        {uploadProgress < 100 ? "Uploading file..." : "Server is processing records..."}
                                    </span>
                                    <span className="text-indigo-600 dark:text-indigo-400">{uploadProgress}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border dark:border-gray-700">
                                    <div
                                        className={`h-full bg-indigo-600 transition-all duration-300 ${uploadProgress === 100 ? 'animate-pulse' : ''}`}
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 italic text-center">
                                    Please do not close this dialog while processing.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Results Display */}
            {results && (
                <Card className="border-0 shadow-lg animate-in fade-in zoom-in slide-in-from-top-4 duration-500 overflow-hidden">
                    <div className={`h-1 w-full ${results.failed === 0 ? 'bg-green-500' : results.success === 0 ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Import Results</span>
                            {results.failed === 0 && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Success</span>
                            )}
                        </CardTitle>
                        <CardDescription>Summary of the last bulk creation process</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <div className="text-sm text-green-800 dark:text-green-400 font-medium">Successful</div>
                                    <div className="text-2xl font-bold text-green-700">{results.success} records</div>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <div className="text-sm text-red-800 dark:text-red-400 font-medium">Failed</div>
                                    <div className="text-2xl font-bold text-red-700">{results.failed} records</div>
                                </div>
                            </div>
                        </div>

                        {results.errors?.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold flex items-center gap-2">
                                    Error Details
                                    <span className="text-[10px] bg-red-100 text-red-600 px-2 rounded-full">See logs</span>
                                </p>
                                <div className="max-h-48 overflow-y-auto rounded-lg border bg-gray-50/50 p-2 text-xs space-y-1">
                                    {results.errors.slice(0, 10).map((err, idx) => (
                                        <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded border-l-2 border-l-red-500 flex justify-between">
                                            <span className="font-medium">{err.email}</span>
                                            <span className="text-red-600 italic">"{err.error}"</span>
                                        </div>
                                    ))}
                                    {results.errors.length > 10 && (
                                        <p className="text-center py-2 text-muted-foreground italic">...and {results.errors.length - 10} more errors</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
