import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2, Upload, FileText, Settings, Plus, Info, Eye, Edit2, X, Save } from 'lucide-react';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BASE_URL } from '@/api';
import { cn } from "@/lib/utils";

export default function TemplateUploadPage() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  const [showHbsCode, setShowHbsCode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'id_card',
    user_type: 'student',
    template_type: 'pdf',
    background_image: null,
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [bgFile, setBgFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleBgFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBgFile(file);
    const url = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, background_image: url }));
  };

  const [canvasSize, setCanvasSize] = useState({ width: 595, height: 842 });
  const [hbsCode, setHbsCode] = useState("");
  const [fieldConfig, setFieldConfig] = useState({
    fields: [
      { key: 'name', x: 278, y: 551, size: 16, color: '#000000', type: 'text' },
      { key: 'photo', x: 150, y: 200, width: 100, height: 130, type: 'image' },
    ]
  });

  const designerRef = useRef(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['document_templates'],
    queryFn: documentApi.getTemplates,
  });

  // Load HBS code directly from the template object (served inline by the backend) when editing
  useEffect(() => {
    if (editingId && formData.template_type === 'hbs') {
      const tpl = templates.find(t => t.id === editingId);
      if (tpl && tpl.hbs_code) {
        setHbsCode(tpl.hbs_code);
      }
    }
  }, [editingId, formData.template_type, templates]);

  // Generate live HBS preview HTML
  const getHbsLivePreview = () => {
    if (!hbsCode) return "";

    // Sample student data
    const dummyData = {
      name: "Sample Student",
      admission_number: "ADM-2024-001",
      academic_year: "2024-25",
      class_name: "10th",
      grade_name: "A",
      user_type: "Student",
      phone: "9876543210",
      photo: "https://via.placeholder.com/150",
      // Include the custom background image or fall back to the default asset path
      background_image: formData.background_image || `${BASE_URL.replace('/api', '')}/assets/id_card_bg.png`
    };

    let html = hbsCode;

    // Handle {{#if photo}} ... {{else}} ... {{/if}}
    const processIf = (dataKey, content) => {
      const val = dummyData[dataKey];
      if (val) {
        // Keep if block, remove else if exists
        let processed = content.replace(/{{else}}[\s\S]*?$/, '');
        return processed;
      } else {
        // Keep else block if exists, otherwise empty
        const elseMatch = content.match(/{{else}}([\s\S]*?)$/);
        return elseMatch ? elseMatch[1] : '';
      }
    };

    // Replace if blocks
    html = html.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, key, content) => {
      return processIf(key, content);
    });

    // Replace variables
    Object.keys(dummyData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, dummyData[key]);
    });

    return html;
  };

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDesignerClick = (e) => {
    if (!designerRef.current || !previewUrl) return;

    const rect = designerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Map to 0-100 percentage
    const virtualX = Number(((clickX / rect.width) * 100).toFixed(2));
    const virtualY = Number(((clickY / rect.height) * 100).toFixed(2));

    updateField(activeFieldIndex, { x: virtualX, y: virtualY });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    // Add toolbar=0 to the local blob too (might not work in all browsers but doesn't hurt)
    setPreviewUrl(`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`);

    // If it's an HBS file, read it into state for live editing
    if (file.name.endsWith('.hbs') || file.name.endsWith('.html')) {
      const reader = new FileReader();
      reader.onload = (re) => setHbsCode(re.target.result);
      reader.readAsText(file);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: documentApi.uploadTemplate,
    onSuccess: () => {
      toast.success('Template uploaded successfully');
      resetForm();
      queryClient.invalidateQueries(['document_templates']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Upload failed');
      setIsUploading(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: documentApi.updateTemplate,
    onSuccess: () => {
      toast.success('Template updated successfully');
      resetForm();
      queryClient.invalidateQueries(['document_templates']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Update failed');
      setIsUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: documentApi.deleteTemplate,
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries(['document_templates']);
    }
  });

  const resetForm = () => {
    setFormData({ name: '', type: 'id_card', user_type: 'student', template_type: 'pdf', background_image: null });
    setSelectedFile(null);
    setBgFile(null);
    setPreviewUrl(null);
    setEditingId(null);
    setIsUploading(false);
    setActiveFieldIndex(0);
    setHbsCode("");
    setCanvasSize({ width: 595, height: 842 });
    setFieldConfig({
      fields: [
        { key: 'name', x: 278, y: 551, size: 16, color: '#000000', type: 'text' },
        { key: 'photo', x: 150, y: 200, width: 100, height: 130, type: 'image' },
      ]
    });
  };

  const handleEdit = (tpl) => {
    setEditingId(tpl.id);
    setFormData({
      name: tpl.name,
      type: tpl.type,
      user_type: tpl.user_type,
      template_type: tpl.template_type,
      background_image: tpl.background_image || null,
    });
    setBgFile(null);

    setCanvasSize({
      width: tpl.width || 595,
      height: tpl.height || 842
    });

    let config = { fields: [] };
    try {
      config = typeof tpl.field_config === 'string' ? JSON.parse(tpl.field_config) : (tpl.field_config || { fields: [] });
    } catch (e) {
      console.error(e);
    }
    setFieldConfig(config);
    setActiveFieldIndex(0);

    // Set preview URL to the existing file
    setPreviewUrl(`${BASE_URL.replace('/api', '')}/${tpl.file_path}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = () => {
    if (!formData.name) return toast.error('Please provide a name');
    if (!editingId && !selectedFile) return toast.error('Please select a file');

    setIsUploading(true);

    const data = new FormData();
    data.append('name', formData.name);
    data.append('type', formData.type);
    data.append('user_type', formData.user_type);
    data.append('template_type', formData.template_type);

    if (selectedFile) {
      data.append('template', selectedFile);
    }
    if (bgFile) {
      data.append('background_image', bgFile);
    }
    data.append('field_config', JSON.stringify(fieldConfig));
    if (formData.template_type === 'hbs') {
      data.append('hbs_code', hbsCode);
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: data
      });
    } else {
      uploadMutation.mutate(data);
    }
  };

  const addField = () => {
    setFieldConfig(prev => ({
      fields: [...prev.fields, { key: 'new_field', x: 100, y: 100, size: 12, color: '#000000', type: 'text' }]
    }));
    setActiveFieldIndex(fieldConfig.fields.length);
  };

  const updateField = (index, updates) => {
    const newFields = [...fieldConfig.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFieldConfig({ fields: newFields });
  };

  const removeField = (index) => {
    setFieldConfig({ fields: fieldConfig.fields.filter((_, i) => i !== index) });
    if (activeFieldIndex >= index && activeFieldIndex > 0) setActiveFieldIndex(activeFieldIndex - 1);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Template Studio</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Design and manage your dynamic document templates.</p>
        </div>
        {editingId && (
          <Button variant="outline" onClick={resetForm} className="flex items-center gap-2">
            <X className="w-4 h-4" /> Cancel Editing
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: Configuration Form */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="shadow-lg border-slate-200 dark:border-slate-800 sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
                {editingId ? 'Edit Template' : 'Add New Template'}
              </CardTitle>
              <CardDescription>Configure document layout and mapping fields.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g. Student ID Portrait 2024"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id_card">ID Card</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>User Type</Label>
                  <Select value={formData.user_type} onValueChange={v => setFormData({ ...formData, user_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Template Technology</Label>
                <Select value={formData.template_type} onValueChange={v => setFormData({ ...formData, template_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Overlay (Visual Designer)</SelectItem>
                    <SelectItem value="hbs">Handlebars HTML (Advanced Styling)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.template_type === 'hbs' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-indigo-600 font-bold">HTML/CSS Editor (HBS)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHbsCode(!showHbsCode)}
                        className="h-6 text-[10px] px-2"
                      >
                        {showHbsCode ? 'Hide Code' : 'Show Code'}
                      </Button>
                      <Badge variant="outline" className="text-[10px] text-indigo-500 dark:text-indigo-500 bg-indigo-50">Live Preview Enabled</Badge>
                    </div>
                  </div>
                  {showHbsCode && (
                    <textarea
                      value={hbsCode}
                      onChange={e => setHbsCode(e.target.value)}
                      className="w-full h-[400px] p-3 text-[11px] font-mono bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-inner"
                      placeholder="<!-- Write your HBS/HTML code here -->"
                    />
                  )}
                  {/* <p className="text-[10px] text-slate-500 italic">Tip: Use \u007B\u007Bname\u007D\u007D, \u007B\u007Bphoto\u007D\u007D, \u007B\u007Badmission_number\u007D\u007D in your code.</p> */}
                </div>
              )}

              {!editingId && (
                <div className="space-y-2 pt-2">
                  <Label className="block mb-2">Upload Template File ({formData.template_type === 'pdf' ? '.pdf' : '.hbs, .html'})</Label>
                  <Input
                    type="file"
                    accept={formData.template_type === 'pdf' ? '.pdf' : '.hbs,.html'}
                    onChange={handleFileChange}
                    className="cursor-pointer file:bg-indigo-50 file:text-indigo-700 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-4 file:text-xs"
                  />
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Label className="block mb-2">Upload Background Image (Optional)</Label>
                {formData.background_image && (
                  <div className="mb-2 relative w-24 h-16 rounded border overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                    <img src={formData.background_image} alt="Background Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBgFileChange}
                  className="cursor-pointer file:bg-indigo-50 file:text-indigo-700 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-4 file:text-xs"
                />
              </div>

              {formData.template_type === 'pdf' && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-500" />
                      Field Mapping
                    </Label>
                    <Button variant="ghost" size="sm" onClick={addField} className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                      <Plus className="w-3 h-3 mr-1" /> Add Field
                    </Button>
                  </div>

                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {fieldConfig.fields.map((field, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveFieldIndex(idx)}
                          className={cn(
                            "p-4 rounded-xl border space-y-3 relative group transition-all cursor-pointer",
                            activeFieldIndex === idx
                              ? "bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-200"
                          )}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); removeField(idx); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-slate-500">Field Key</Label>
                              <Input
                                value={field.key}
                                onChange={e => updateField(idx, { key: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-slate-500">Type</Label>
                              <Select value={field.type} onValueChange={v => updateField(idx, { type: v })}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="image">Image</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-slate-500">X (%)</Label>
                              <Input type="number" value={field.x} onChange={e => updateField(idx, { x: Number(e.target.value) })} className="h-8 text-[10px]" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-slate-500">Y (%)</Label>
                              <Input type="number" value={field.y} onChange={e => updateField(idx, { y: Number(e.target.value) })} className="h-8 text-[10px]" />
                            </div>
                            {field.type === 'text' ? (
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-slate-500">Size</Label>
                                <Input type="number" value={field.size} onChange={e => updateField(idx, { size: Number(e.target.value) })} className="h-8 text-[10px]" />
                              </div>
                            ) : (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase text-slate-500">W (%)</Label>
                                  <Input type="number" value={field.width} onChange={e => updateField(idx, { width: Number(e.target.value) })} className="h-8 text-[10px]" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase text-slate-500">H (%)</Label>
                                  <Input type="number" value={field.height} onChange={e => updateField(idx, { height: Number(e.target.value) })} className="h-8 text-[10px]" />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Button
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 shadow-md h-11"
                onClick={handleSave}
                disabled={isUploading}
              >
                {isUploading ? 'Processing...' : <>{editingId ? <Save className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />} {editingId ? 'Update Template' : 'Create Template'}</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview & Active Templates */}
        <div className="xl:col-span-8 space-y-6">
          {/* Visual Designer Preview */}
          <Card className="shadow-lg border-indigo-100 dark:border-indigo-900 overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {formData.template_type === 'pdf' ? 'Visual Designer' : 'Template Preview'}
                  </CardTitle>
                  <CardDescription>
                    {formData.template_type === 'pdf'
                      ? 'Click on the card to set position for selected field.'
                      : 'HBS templates use HTML/CSS for layout. Position inputs below are ignored.'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white dark:bg-slate-950">
                    <Eye className="w-3 h-3 mr-1 text-indigo-500" /> Live Preview
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-slate-200 dark:bg-slate-950 min-h-[850px] relative flex items-center justify-center">
              {previewUrl ? (
                <div
                  ref={designerRef}
                  onClick={formData.template_type === 'pdf' ? handleDesignerClick : undefined}
                  className={cn(
                    "relative shadow-2xl bg-white overflow-hidden [container-type:size]",
                    formData.template_type === 'pdf' ? "cursor-crosshair" : "cursor-default"
                  )}
                  style={{
                    width: formData.template_type === 'hbs'
                      ? (formData.type === 'certificate' ? '548px' : '345px')
                      : '100%',
                    maxWidth: formData.template_type === 'hbs'
                      ? (formData.type === 'certificate' ? '548px' : '345px')
                      : '550px',
                    aspectRatio: formData.template_type === 'hbs'
                      ? (formData.type === 'certificate' ? '842 / 595' : '345 / 570')
                      : `${canvasSize.width} / ${canvasSize.height}`,
                    height: formData.template_type === 'hbs'
                      ? (formData.type === 'certificate' ? '387px' : '570px')
                      : 'auto'
                  }}
                >
                  {/* The actual PDF preview or Image Preview */}
                  {editingId ? (
                    formData.template_type === 'pdf' ? (
                      <img
                        src={`${BASE_URL}/documents/templates/${editingId}/preview`}
                        className="w-full h-full object-contain"
                        alt="Template Preview"
                      />
                    ) : (
                      <iframe
                        srcDoc={getHbsLivePreview()}
                        className="border-0"
                        style={{
                          width: formData.type === 'certificate' ? '842px' : '100%',
                          height: formData.type === 'certificate' ? '595px' : '100%',
                          transform: formData.type === 'certificate' ? 'scale(0.65)' : 'none',
                          transformOrigin: 'top left',
                        }}
                        title="HBS Live Preview"
                      />
                    )
                  ) : (
                    formData.template_type === 'pdf' ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full border-0 pointer-events-none"
                        style={{ overflow: 'hidden' }}
                        scrolling="no"
                        title="Template Preview"
                      />
                    ) : (
                      <iframe
                        srcDoc={getHbsLivePreview()}
                        className="border-0"
                        style={{
                          width: formData.type === 'certificate' ? '842px' : '100%',
                          height: formData.type === 'certificate' ? '595px' : '100%',
                          transform: formData.type === 'certificate' ? 'scale(0.65)' : 'none',
                          transformOrigin: 'top left',
                        }}
                        title="HBS Live Preview"
                      />
                    )
                  )}

                  {/* The Overlay Layer (Only for PDF) */}
                  {formData.template_type === 'pdf' && (
                    <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                      {fieldConfig.fields.map((field, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "absolute border-2 flex items-center justify-center font-bold overflow-hidden transition-all",
                            activeFieldIndex === idx ? "z-20 scale-105 shadow-lg" : "z-10 opacity-70",
                            field.type === 'text'
                              ? "border-blue-500 bg-blue-500/20 text-blue-700"
                              : "border-orange-500 bg-orange-500/20 text-orange-700"
                          )}
                          style={{
                            left: `${field.x}%`,
                            top: `${field.y}%`,
                            width: field.type === 'image' ? `${field.width}%` : 'auto',
                            height: field.type === 'image' ? `${field.height}%` : 'auto',
                            padding: '0',
                            fontSize: field.type === 'text' ? `${(field.size / canvasSize.height) * 100}cqh` : 'inherit',
                            lineHeight: '1',
                          }}
                        >
                          {field.key || 'untitled'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-full shadow-inner">
                    <FileText className="w-12 h-12 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">No template selected.</p>
                    <p className="text-xs opacity-70 mt-1">Select a file or edit an existing template to start designing.</p>
                  </div>
                </div>
              )}
            </CardContent>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-6 text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500/20 border border-blue-500"></div> Text Field
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500/20 border border-orange-500"></div> Image Field
              </div>
              <div className="ml-auto italic">
                * Position fields by clicking on the designer above. Coordinates are stored as percentages (0-100).
              </div>
            </div>
          </Card>

          {/* Templates List */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Existing Templates</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-400 italic">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
                  <Info className="w-8 h-8 opacity-20" />
                  <p>No templates found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(tpl => (
                    <div key={tpl.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg group-hover:bg-indigo-100 transition-colors">
                          <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100">{tpl.name}</h3>
                          <div className="flex gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[9px] h-4 py-0 uppercase">{tpl.type}</Badge>
                            <Badge variant="outline" className="text-[9px] h-4 py-0 uppercase">{tpl.user_type}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-indigo-500 hover:bg-indigo-50"
                          onClick={() => handleEdit(tpl)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-red-500 hover:bg-red-50"
                          onClick={() => deleteMutation.mutate(tpl.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
