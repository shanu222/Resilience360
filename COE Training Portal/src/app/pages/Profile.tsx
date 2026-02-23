import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { AlertCircle, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export function Profile() {
  const { user, updateProfile } = useAuth();

  const initialForm = useMemo(() => {
    if (!user) {
      return {
        name: "",
        email: "",
        qualifications: "",
        university: "",
        cnic: "",
        reason: "",
      };
    }

    if (user.role === "admin") {
      return {
        name: user.name,
        email: user.email,
        qualifications: "",
        university: "",
        cnic: "",
        reason: "",
      };
    }

    return {
      name: user.name,
      email: user.email,
      qualifications: user.qualifications,
      university: user.university,
      cnic: user.cnic,
      reason: user.reason,
    };
  }, [user]);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  const isTrainee = user.role === "trainee";

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = "Invalid email format";

    if (isTrainee) {
      if (!form.qualifications.trim()) nextErrors.qualifications = "Qualifications are required";
      if (!form.university.trim()) nextErrors.university = "University/College is required";
      if (!form.reason.trim()) nextErrors.reason = "Reason is required";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const success = updateProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      qualifications: isTrainee ? form.qualifications.trim() : undefined,
      university: isTrainee ? form.university.trim() : undefined,
      reason: isTrainee ? form.reason.trim() : undefined,
    });

    if (!success) {
      toast.error("Unable to save profile. The email may already be in use.");
      return;
    }

    toast.success("Profile updated successfully.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>View and edit your account details.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full Name</Label>
                <Input
                  id="profile-name"
                  value={form.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">Email Address</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>

              {isTrainee && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="profile-qualifications">Qualifications/Degree</Label>
                    <Input
                      id="profile-qualifications"
                      value={form.qualifications}
                      onChange={(event) => handleChange("qualifications", event.target.value)}
                    />
                    {errors.qualifications && <p className="text-xs text-red-600">{errors.qualifications}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-university">University/College</Label>
                    <Input
                      id="profile-university"
                      value={form.university}
                      onChange={(event) => handleChange("university", event.target.value)}
                    />
                    {errors.university && <p className="text-xs text-red-600">{errors.university}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="profile-cnic">CNIC (Locked)</Label>
                    <Input id="profile-cnic" value={form.cnic} disabled readOnly />
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      CNIC cannot be changed after signup. It must always match your original CNIC.
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="profile-reason">Why did you join?</Label>
                    <Textarea
                      id="profile-reason"
                      rows={4}
                      value={form.reason}
                      onChange={(event) => handleChange("reason", event.target.value)}
                    />
                    {errors.reason && <p className="text-xs text-red-600">{errors.reason}</p>}
                  </div>
                </>
              )}
            </div>

            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
