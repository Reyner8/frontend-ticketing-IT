import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle2, Upload, X, FileIcon, AlertCircle, ImageIcon } from "lucide-react";
import { submitPublicRequest } from "../lib/api/services";
import { ApiError } from "../lib/api/client";

interface FormData {
  title: string;
  description: string;
  reporterName: string;
  reporterUnit: string;
  attachments: File[];
}

const INITIAL_FORM: FormData = {
  title: "",
  description: "",
  reporterName: "",
  reporterUnit: "",
  attachments: [],
};

export function PublicSubmissionForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (newFiles.length !== e.target.files.length) {
      toast.error("Hanya file gambar yang diperbolehkan");
    }

    const totalSize = [...formData.attachments, ...newFiles].reduce(
      (acc, file) => acc + file.size,
      0
    );

    if (totalSize > 10 * 1024 * 1024) {
      toast.error("Total ukuran file melebihi batas 10MB");
      return;
    }

    if (formData.attachments.length + newFiles.length > 5) {
      toast.error("Maksimal 5 gambar bukti");
      return;
    }

    setFormData({
      ...formData,
      attachments: [...formData.attachments, ...newFiles],
    });
  };

  const removeFile = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const honeypot = new FormData(e.currentTarget).get("website");
    if (typeof honeypot === "string" && honeypot.trim() !== "") {
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitPublicRequest(
        {
          title: formData.title,
          description: formData.description,
          submitter_name: formData.reporterName,
          submitter_unit: formData.reporterUnit,
        },
        formData.attachments
      );

      setReferenceNumber(result.reference_number);
      toast.success("Laporan berhasil dikirim!");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        toast.error("Terlalu banyak pengiriman. Silakan coba lagi beberapa menit.");
      } else if (err instanceof ApiError && err.status === 401) {
        toast.error("Form tidak tersedia saat ini. Hubungi tim IT secara langsung.");
      } else if (err instanceof ApiError && err.errors) {
        const first = Object.values(err.errors)[0]?.[0];
        toast.error(first ?? err.message);
      } else {
        toast.error(
          err instanceof Error ? err.message : "Gagal mengirim laporan. Silakan coba lagi."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setReferenceNumber(null);
    setFormData(INITIAL_FORM);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-lg">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Laporan Berhasil Dikirim</CardTitle>
            <CardDescription className="text-base">
              Tim IT akan meninjau laporan Anda dan menindaklanjuti sesuai kebutuhan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Simpan nomor referensi di bawah untuk melacak laporan Anda. Tim IT akan
                mengklasifikasikan masalah dan menugaskan ke tim yang sesuai.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="text-sm text-gray-600">
                <strong>Nomor referensi:</strong> {referenceNumber ?? "—"}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Pelapor:</strong> {formData.reporterName}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Unit:</strong> {formData.reporterUnit}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Tanggal:</strong> {new Date().toLocaleString("id-ID")}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={resetForm} className="flex-1">
                Kirim Laporan Lain
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => window.close()}>
                Tutup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2 border-b bg-white">
            <CardTitle className="text-2xl">Form Laporan IT</CardTitle>
            <CardDescription>
              Laporkan masalah atau kendala yang Anda alami. Tim IT akan meninjau dan
              menindaklanjuti laporan Anda.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                type="text"
                name="website"
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <div className="space-y-4">
                <h3 className="font-semibold">Data Pelapor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reporterName">Nama Lengkap *</Label>
                    <Input
                      id="reporterName"
                      value={formData.reporterName}
                      onChange={(e) =>
                        setFormData({ ...formData, reporterName: e.target.value })
                      }
                      placeholder="Nama Anda"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reporterUnit">Unit / Departemen *</Label>
                    <Input
                      id="reporterUnit"
                      value={formData.reporterUnit}
                      onChange={(e) =>
                        setFormData({ ...formData, reporterUnit: e.target.value })
                      }
                      placeholder="Contoh: Keuangan, HR, Operasional"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold">Detail Laporan</h3>

                <div className="space-y-2">
                  <Label htmlFor="title">Judul Laporan *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ringkasan singkat masalah yang dialami"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Keterangan Detail *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Jelaskan masalah yang terjadi, kapan, dan dampaknya terhadap pekerjaan Anda..."
                    rows={5}
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Bukti Gambar (opsional)
                  </Label>
                  <p className="text-sm text-gray-500">
                    Unggah screenshot atau foto sebagai bukti (maks. 5 gambar, total 10MB)
                  </p>

                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="fileUpload"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                    />
                    <label htmlFor="fileUpload" className="cursor-pointer">
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <div className="text-sm">
                        <span className="text-blue-600 font-medium">Klik untuk unggah</span>{" "}
                        atau seret file ke sini
                      </div>
                      <div className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WEBP</div>
                    </label>
                  </div>

                  {formData.attachments.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">File terlampir:</div>
                      {formData.attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{file.name}</div>
                              <div className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6 flex gap-3">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Mengirim..." : "Kirim Laporan"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Reset
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Kolom bertanda * wajib diisi. Anda tidak perlu memilih jenis masalah — tim IT
                akan menentukan klasifikasi dan penugasan.
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Butuh bantuan segera? Hubungi IT Support: support@company.com | Ext. 1234</p>
        </div>
      </div>
    </div>
  );
}
